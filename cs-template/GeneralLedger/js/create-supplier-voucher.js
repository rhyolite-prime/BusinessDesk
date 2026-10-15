const { createApp } = Vue;

createApp({
    data() {
        return {
            currentTab: 'voucher',
            form: {
                payeeId: '',
                payeeName: '',
                entryDate: new Date().toISOString().slice(0, 10),
                bankGl: '',
                currencyCode: 'GHS',
                modeOfPayment: 'Cash',
                paymentDate: new Date().toISOString().slice(0, 10),
                batchNo: '',
                isMultiCurrency: false,
                currencyRate: 1.0000,
                withholdingRate: 5,
                withholdingCreditGl: '21501002 - Withholding Tax Payable',
                withholdingTaxType: 'WHT 5%',
                withholdingVatAccount: '11202001 - VAT Input Account',
                getfl: false,
                nhil: false,
                cst: false,
                covid: false,
                vat: false,
                withheldAmount: 0.00,
                retainedAmount: 0.00,
                netAmount: 0.00,
                vatWithheldAmount: 0.00,
                lines: [],
                retentions: []
            },
            
            // Mock data lists
            suppliers: [
                { id: 's1', name: 'ARABA AKYERE' },
                { id: 's2', name: 'KOW MENSAH ENTERPRISE' },
                { id: 's3', name: 'ADWOA DANSO LTD' },
                { id: 's4', name: 'RHYOLITE TECH SYSTEMS' }
            ],
            currencies: [
                { code: 'GHS', name: 'Ghana Cedi' },
                { code: 'USD', name: 'US Dollar' },
                { code: 'EUR', name: 'Euro' },
                { code: 'GBP', name: 'British Pound' }
            ],
            bankAccounts: [
                '12702001 - Cash in Bank',
                '12702002 - Barclays Operating Account',
                '12702003 - Ecobank Corporate Account'
            ],
            debitGlAccounts: [
                '11102001 - Building: Offices',
                '51101004 - Office Supplies & Stationary',
                '51102002 - Staff Travel & Transport',
                '51103001 - Electricity Expenses',
                '51104010 - IT Infrastructure Maintenance'
            ],
            withholdingGlAccounts: [
                '21501002 - Withholding Tax Payable',
                '21601005 - Retention Payable',
                '21501005 - Other Tax Liabilities'
            ],
            vatGlAccounts: [
                '11202001 - VAT Input Account',
                '21202001 - VAT Output Account'
            ],
            orgUnits: [
                'SISCO/Academic',
                'Administration',
                'Human Resources',
                'Finance',
                'IT Department'
            ]
        };
    },
    computed: {
        totalLocalLines() {
            return this.form.lines.reduce((sum, line) => sum + (line.localAmount || 0), 0);
        },
        totalForeignLines() {
            return this.form.lines.reduce((sum, line) => sum + (line.foreignAmount || 0), 0);
        },
        calculatedVatAmount() {
            // Apply VAT calculations based on checkboxes
            let rateSum = 0;
            if (this.form.getfl) rateSum += 2.5; // GETFund 2.5%
            if (this.form.nhil) rateSum += 2.5;  // NHIL 2.5%
            if (this.form.covid) rateSum += 1.0; // Covid 1%
            if (this.form.vat) rateSum += 15.0;   // standard VAT 15%
            if (this.form.cst) rateSum += 5.0;   // CST 5%
            
            // Calculate VAT on total local lines marked with withholding/tax
            const taxableAmount = this.form.lines
                .filter(l => l.isWithhold)
                .reduce((sum, l) => sum + (l.localAmount || 0), 0);

            return (taxableAmount * rateSum) / 100;
        }
    },
    methods: {
        addLine() {
            this.form.lines.push({
                isWithhold: false,
                invoiceNo: '',
                referenceNo: '',
                glAccount: '',
                description: '',
                localAmount: 0,
                foreignAmount: 0,
                orgUnit: this.orgUnits[0]
            });
        },
        removeLine(index) {
            this.form.lines.splice(index, 1);
            this.calculateTotals();
        },
        calculateLineForeign(line) {
            const rate = this.form.currencyRate || 1.0;
            line.foreignAmount = Number((line.localAmount / rate).toFixed(2));
            this.calculateTotals();
        },
        toggleMultiCurrency() {
            if (!this.form.isMultiCurrency) {
                this.form.currencyRate = 1.0000;
            }
            // Recalculate all lines foreign amount
            this.form.lines.forEach(line => this.calculateLineForeign(line));
        },
        addRetention() {
            this.form.retentions.push({
                description: '',
                creditGl: '21601005 - Retention Payable',
                amount: 0,
                isPercentage: false,
                calculatedTotal: 0
            });
        },
        removeRetention(index) {
            this.form.retentions.splice(index, 1);
            this.calculateTotals();
        },
        calculateRetentionTotal(ret) {
            if (ret.isPercentage) {
                ret.calculatedTotal = Number(((ret.amount * this.totalLocalLines) / 100).toFixed(2));
            } else {
                ret.calculatedTotal = ret.amount || 0;
            }
            this.calculateTotals();
        },
        calculateTotals() {
            // 1. Calculate Withheld Tax
            const withholdableSum = this.form.lines
                .filter(l => l.isWithhold)
                .reduce((sum, l) => sum + (l.localAmount || 0), 0);
            
            this.form.withheldAmount = Number(((withholdableSum * (this.form.withholdingRate || 0)) / 100).toFixed(2));

            // 2. Calculate Retained Amount
            // First update dynamic percentage-based retentions
            this.form.retentions.forEach(ret => {
                if (ret.isPercentage) {
                    ret.calculatedTotal = Number(((ret.amount * this.totalLocalLines) / 100).toFixed(2));
                } else {
                    ret.calculatedTotal = ret.amount || 0;
                }
            });
            this.form.retainedAmount = this.form.retentions.reduce((sum, ret) => sum + (ret.calculatedTotal || 0), 0);

            // 3. VAT Withheld calculations
            this.form.vatWithheldAmount = Number(this.calculatedVatAmount.toFixed(2));

            // 4. Net Amount
            this.form.netAmount = Number((this.totalLocalLines - this.form.withheldAmount - this.form.retainedAmount).toFixed(2));
        },
        updatePayeeName() {
            const supplier = this.suppliers.find(s => s.id === this.form.payeeId);
            if (supplier) {
                this.form.payeeName = supplier.name;
            }
        },
        formatCurrency(value) {
            return new Intl.NumberFormat('en-GH', {
                style: 'currency',
                currency: this.form.currencyCode,
                minimumFractionDigits: 2
            }).format(value);
        },
        saveVoucher() {
            if (this.form.lines.length === 0) {
                alert('Please add at least one line item to the payment voucher.');
                return;
            }

            this.calculateTotals();

            // Load existing
            let vouchers = [];
            const rawVouchers = localStorage.getItem('orbit_supplier_vouchers');
            if (rawVouchers) {
                vouchers = JSON.parse(rawVouchers);
            }

            // Generate Voucher Number
            const nextNo = vouchers.length + 1;
            const voucherNo = `SPV-2026-${String(nextNo).padStart(4, '0')}`;

            const newVoucher = {
                id: 's_' + Date.now(),
                voucherNo: voucherNo,
                payeeId: this.form.payeeId,
                payeeName: this.form.payeeName,
                entryDate: this.form.entryDate,
                bankGl: this.form.bankGl,
                currencyCode: this.form.currencyCode,
                modeOfPayment: this.form.modeOfPayment,
                paymentDate: this.form.paymentDate,
                batchNo: this.form.batchNo,
                chequeNo: this.form.chequeNo,
                totalAmount: this.totalLocalLines,
                withholdingRate: this.form.withholdingRate,
                withholdingCreditGl: this.form.withholdingCreditGl,
                withholdingTaxType: this.form.withholdingTaxType,
                withholdingVatAccount: this.form.withholdingVatAccount,
                withheldAmount: this.form.withheldAmount,
                retainedAmount: this.form.retainedAmount,
                netAmount: this.form.netAmount,
                lines: this.form.lines,
                retentions: this.form.retentions
            };

            vouchers.unshift(newVoucher); // Add to the top of the list
            localStorage.setItem('orbit_supplier_vouchers', JSON.stringify(vouchers));

            // Redirect back to main Vouchers page with active tab parameter
            window.location.href = '/GeneralLedger/Vouchers?tab=supplier';
        }
    },
    mounted() {
        // Start with a blank line for good UX
        this.addLine();
    }
}).mount("#app");
