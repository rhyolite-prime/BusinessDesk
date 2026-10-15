const { createApp } = Vue;

createApp({
    data() {
        return {
            form: {
                customerId: '',
                customerName: '',
                entryDate: new Date().toISOString().slice(0, 10),
                bankGl: '',
                currencyCode: 'GHS',
                modeOfReceipt: 'Cash',
                receiptDate: new Date().toISOString().slice(0, 10),
                batchNo: '',
                isMultiCurrency: false,
                currencyRate: 1.0000,
                lines: []
            },
            
            // Mock data lists
            customers: [
                { id: 'c1', name: 'WEST AFRICA HIGH SCHOOL' },
                { id: 'c2', name: 'ACCRA GIRLS SCHOOL' },
                { id: 'c3', name: 'PRESEC LEGON' },
                { id: 'c4', name: 'ACHIMOTA SCHOOL' },
                { id: 'c5', name: 'ABURI GIRLS SHS' }
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
            creditGlAccounts: [
                '41101001 - School Fees Revenue',
                '41101002 - Registration & Admission Fees',
                '41102005 - Other Miscellaneous Revenue',
                '11204001 - Accounts Receivable',
                '21501010 - Deferred Revenue'
            ],
            orgUnits: [
                'SISCO/Academic',
                'Administration',
                'Human Resources',
                'Finance'
            ]
        };
    },
    computed: {
        totalLocalLines() {
            return this.form.lines.reduce((sum, line) => sum + (line.localAmount || 0), 0);
        },
        totalForeignLines() {
            return this.form.lines.reduce((sum, line) => sum + (line.foreignAmount || 0), 0);
        }
    },
    methods: {
        addLine() {
            this.form.lines.push({
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
        },
        calculateLineForeign(line) {
            const rate = this.form.currencyRate || 1.0;
            line.foreignAmount = Number((line.localAmount / rate).toFixed(2));
        },
        toggleMultiCurrency() {
            if (!this.form.isMultiCurrency) {
                this.form.currencyRate = 1.0000;
            }
            this.form.lines.forEach(line => this.calculateLineForeign(line));
        },
        updateCustomerName() {
            const customer = this.customers.find(c => c.id === this.form.customerId);
            if (customer) {
                this.form.customerName = customer.name;
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
                alert('Please add at least one line item to the receipt voucher.');
                return;
            }

            let vouchers = [];
            const rawVouchers = localStorage.getItem('orbit_customer_vouchers');
            if (rawVouchers) {
                vouchers = JSON.parse(rawVouchers);
            }

            const nextNo = vouchers.length + 1;
            const voucherNo = `CRV-2026-${String(nextNo).padStart(4, '0')}`;

            const newVoucher = {
                id: 'c_' + Date.now(),
                voucherNo: voucherNo,
                customerId: this.form.customerId,
                customerName: this.form.customerName,
                entryDate: this.form.entryDate,
                bankGl: this.form.bankGl,
                currencyCode: this.form.currencyCode,
                modeOfReceipt: this.form.modeOfReceipt,
                receiptDate: this.form.receiptDate,
                batchNo: this.form.batchNo,
                totalAmount: this.totalLocalLines,
                netAmount: this.totalLocalLines,
                lines: this.form.lines
            };

            vouchers.unshift(newVoucher);
            localStorage.setItem('orbit_customer_vouchers', JSON.stringify(vouchers));

            window.location.href = '/GeneralLedger/Vouchers?tab=customer';
        }
    },
    mounted() {
        this.addLine();
    }
}).mount("#app");
