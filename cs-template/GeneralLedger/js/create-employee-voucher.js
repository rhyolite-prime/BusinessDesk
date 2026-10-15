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
                withholdingRate: 0, // Employees usually don't have withholding tax on standard expenses
                withholdingCreditGl: '21501002 - Withholding Tax Payable',
                withholdingTaxType: 'WHT',
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
            employees: [
                { id: 'e1', name: 'DR. Emmanuel Addo-Odame' },
                { id: 'e2', name: 'Kwadwo Boateng' },
                { id: 'e3', name: 'Ama Serwaah' },
                { id: 'e4', name: 'John Doe' },
                { id: 'e5', name: 'Jane Smith' }
            ],
            currencies: [
                { code: 'GHS', name: 'Ghana Cedi' },
                { code: 'USD', name: 'US Dollar' },
                { code: 'EUR', name: 'Euro' }
            ],
            bankAccounts: [
                '12702001 - Cash in Bank',
                '12702002 - Barclays Operating Account',
                '12702003 - Ecobank Corporate Account'
            ],
            debitGlAccounts: [
                '51102002 - Staff Travel & Transport',
                '51101004 - Office Supplies & Stationary',
                '51103001 - Electricity Expenses',
                '51105001 - Staff Training & Development',
                '51105002 - Medical Reimbursements'
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
            let rateSum = 0;
            if (this.form.getfl) rateSum += 2.5;
            if (this.form.nhil) rateSum += 2.5;
            if (this.form.covid) rateSum += 1.0;
            if (this.form.vat) rateSum += 15.0;
            if (this.form.cst) rateSum += 5.0;
            
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
            const withholdableSum = this.form.lines
                .filter(l => l.isWithhold)
                .reduce((sum, l) => sum + (l.localAmount || 0), 0);
            
            this.form.withheldAmount = Number(((withholdableSum * (this.form.withholdingRate || 0)) / 100).toFixed(2));

            this.form.retentions.forEach(ret => {
                if (ret.isPercentage) {
                    ret.calculatedTotal = Number(((ret.amount * this.totalLocalLines) / 100).toFixed(2));
                } else {
                    ret.calculatedTotal = ret.amount || 0;
                }
            });
            this.form.retainedAmount = this.form.retentions.reduce((sum, ret) => sum + (ret.calculatedTotal || 0), 0);

            this.form.vatWithheldAmount = Number(this.calculatedVatAmount.toFixed(2));

            this.form.netAmount = Number((this.totalLocalLines - this.form.withheldAmount - this.form.retainedAmount).toFixed(2));
        },
        updatePayeeName() {
            const employee = this.employees.find(e => e.id === this.form.payeeId);
            if (employee) {
                this.form.payeeName = employee.name;
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

            let vouchers = [];
            const rawVouchers = localStorage.getItem('orbit_employee_vouchers');
            if (rawVouchers) {
                vouchers = JSON.parse(rawVouchers);
            }

            const nextNo = vouchers.length + 1;
            const voucherNo = `EPV-2026-${String(nextNo).padStart(4, '0')}`;

            const newVoucher = {
                id: 'e_' + Date.now(),
                voucherNo: voucherNo,
                payeeId: this.form.payeeId,
                payeeName: this.form.payeeName,
                entryDate: this.form.entryDate,
                bankGl: this.form.bankGl,
                currencyCode: this.form.currencyCode,
                modeOfPayment: this.form.modeOfPayment,
                paymentDate: this.form.paymentDate,
                batchNo: this.form.batchNo,
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

            vouchers.unshift(newVoucher);
            localStorage.setItem('orbit_employee_vouchers', JSON.stringify(vouchers));

            window.location.href = '/GeneralLedger/Vouchers?tab=employee';
        }
    },
    mounted() {
        this.addLine();
    }
}).mount("#app");
