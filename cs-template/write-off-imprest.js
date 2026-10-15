let vue = new Vue({
    el: '#app',
    data: {
        isShimmerLoading: false,
        employeeList: [],
        filteredEmployeeList: [],
        selectedEmployee: null,
        employeeSearch: '',

        allImprests: [],
        employeeImprests: [],
        selectedImprest: null,

        currencyList: [],
        accountsList: [],

        imprestForm: {
            imprestId: '',
            categoryId: '',
            categoryName: '',
            amountDisbursed: 0,
            outstanding: 0,
            writeOffDate: new Date().toISOString().split('T')[0],
            amount: 0,
            currencyId: '',
            rate: 0,
            authorizedBy: '',
            writtenOffBy: '', // Or current user context

            debitAccountId: '',
            creditAccountId: ''
        },
        errors: {},
        isSubmitting: false
    },

    methods: {

        getEmployees() {

            return axios.get('/PayrollDataEntry/GetEmployees').then(response => {
                this.employeeList = response.data;
                this.filteredEmployeeList = this.employeeList.slice();
            }).catch(err => {
                this.toastHandler('error', 'Unable to retrieve employees');
                this.employeeList = [];
                this.filteredEmployeeList = [];
            }).finally(() => {
                this.isShimmerLoading = false;
            });
        },


        getEmployeeImprests() {

            return axios.get('/LedgerDataEntry/GetEmployeeImprests?employeeId=' + this.selectedEmployee.id).then(response => {
                this.employeeImprests = response.data || [];
            }).catch(err => {
                this.toastHandler('error', 'Unable to retrieve employee imprests');
                this.employeeImprests = [];
            }).finally(() => {
                this.isShimmerLoading = false;
            });
        },

        getCurrencies() {

            return axios.get('/SharedResource/GetCurrencys').then(response => {
                this.currencyList = response.data;
                if (this.currencyList.length > 0) {
                    this.imprestForm.currencyId = this.currencyList[0].id;
                }
            }).catch(err => {
                this.toastHandler('error', 'Unable to retrieve currencies');
            }).finally(() => {
                this.isShimmerLoading = false;
            });
        },

        getLedgerAccounts() {

            axios.get('/LedgerSetups/GetLedgerAccounts/').then(response => {
                response.data.forEach((v) => {
                    v.accountIdentifier = `${v.accountNo} - ${v.accountName}`;
                });
                this.accountsList = response.data;
            }).catch(err => {
                this.toastHandler('error', 'Failed to retrieve accounts.');
            }).finally(() => {
                this.isShimmerLoading = false;
            });
        },

        getAllImprests() {

            axios.get('/LedgerDataEntry/GetImprests').then(response => {
                this.allImprests = response.data || [];
            }).catch(err => {
                this.toastHandler('error', 'Failed to retrieve imprests.');
            }).finally(() => {
                this.isShimmerLoading = false;
            });
        },

        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 10000,
            };

            switch (type) {
                case 'warning':
                    toastr.warning('', message);
                    break;
                case 'error':
                    toastr.error('', message);
                    break;
                default:
                    toastr.success('', message);
                    break;
            }
        },

        filterEmployees() {
            if (!this.employeeSearch || this.employeeSearch.trim() === '') {
                this.filteredEmployeeList = this.employeeList.slice();
                return;
            }

            const search = this.employeeSearch.toLowerCase().trim();
            this.filteredEmployeeList = this.employeeList.filter(emp => {
                const firstName = (emp.firstName || '').toLowerCase();
                const lastName = (emp.lastName || '').toLowerCase();
                const employeeId = (emp.employeeIdentifier || '').toLowerCase();
                const department = (emp.departmentName || '').toLowerCase();

                return firstName.includes(search) ||
                    lastName.includes(search) ||
                    employeeId.includes(search) ||
                    department.includes(search);
            });
        },

        selectEmployee(employee) {
            this.selectedEmployee = employee;
            this.resetImprestSelection();
            this.toastHandler('success', `Selected: ${employee.firstName} ${employee.lastName}`);
            this.getEmployeeImprests();
        },

        clearSelectedEmployee() {
            this.selectedEmployee = null;
            this.employeeImprests = [];
            this.resetImprestSelection();
            this.employeeSearch = '';
            this.filteredEmployeeList = this.employeeList.slice();
        },

        resetImprestSelection() {
            this.imprestForm.imprestId = '';
            this.imprestForm.categoryId = '';
            this.imprestForm.categoryName = '';
            this.imprestForm.amountDisbursed = 0;
            this.imprestForm.outstanding = 0;
            this.selectedImprest = null;
        },

        onImprestChange() {
            this.selectedImprest = this.employeeImprests.find(i => i.id === this.imprestForm.imprestId);
            if (this.selectedImprest) {
                this.imprestForm.categoryId = this.selectedImprest.imprestCategoryId;
                this.imprestForm.categoryName = this.selectedImprest.imprestCategoryName;
                this.imprestForm.amountDisbursed = this.selectedImprest.amount || 0;
                this.imprestForm.outstanding = this.selectedImprest.balance || 0;

                // Set default write-off amount to outstanding balance
                this.imprestForm.amount = this.selectedImprest.balance || 0;
            } else {
                this.resetImprestSelection();
            }
        },

        getInitials(employee) {
            if (!employee) return '';
            const first = (employee.firstName || '').charAt(0);
            const last = (employee.lastName || '').charAt(0);
            return `${first}${last}`.toUpperCase();
        },

        validateForm() {
            this.errors = {};
            let isValid = true;

            if (!this.selectedEmployee) {
                this.errors.employee = 'Please select an employee';
                isValid = false;
            }

            if (!this.imprestForm.imprestId) {
                this.errors.imprestId = 'Please select an imprest to write-off';
                isValid = false;
            }

            if (!this.imprestForm.amount || this.imprestForm.amount <= 0) {
                this.errors.amount = 'Valid Amount is required';
                isValid = false;
            }

            if (this.imprestForm.amount > this.imprestForm.outstanding) {
                this.errors.amountExceeds = 'Amount cannot be greater than outstanding balance';
                isValid = false;
            }

            if (!this.imprestForm.currencyId) {
                this.errors.currencyId = 'Currency is required';
                isValid = false;
            }

            if (!this.imprestForm.debitAccountId) {
                this.errors.debitAccountId = 'Debit G/L is required';
                isValid = false;
            }

            if (!this.imprestForm.creditAccountId) {
                this.errors.creditAccountId = 'Credit G/L is required';
                isValid = false;
            }

            if (this.imprestForm.creditAccountId === this.imprestForm.debitAccountId && this.imprestForm.creditAccountId) {
                this.errors.accountMatch = 'Credit G/L and Debit G/L cannot be the same';
                isValid = false;
            }

            return isValid;
        },

        showValidationErrors() {
            for (let key in this.errors) {
                if (this.errors.hasOwnProperty(key)) {
                    this.toastHandler('warning', this.errors[key]);
                }
            }
        },

        saveWriteOff() {
            if (this.isSubmitting) return;

            if (!this.validateForm()) {
                this.showValidationErrors();
                return;
            }

            this.isSubmitting = true;
            this.isShimmerLoading = true;

            const payload = {
                imprestId: this.imprestForm.imprestId,
                employeeId: this.selectedEmployee.id,
                date: this.imprestForm.writeOffDate,
                amount: this.imprestForm.amount,
                currencyId: this.imprestForm.currencyId,
                rate: this.imprestForm.rate,
                authorizedBy: this.imprestForm.authorizedBy,
                debitAccountId: this.imprestForm.debitAccountId,
                creditAccountId: this.imprestForm.creditAccountId,
                notes: 'Imprest Write-off'
            };

            // Assuming endpoint exists or will exist: /LedgerDataEntry/WriteOffImprestPost
            axios.post('/LedgerDataEntry/WriteOffImprestPost', payload).then(response => {
                if ((response.data && response.data.success) || response.data === 200) {
                    this.toastHandler('success', 'Imprest written off successfully!');
                    setTimeout(() => {
                        window.location.href = '/LedgerDataEntry/Imprest';
                    }, 2000);
                } else {
                    this.toastHandler('error', response.data.message || 'Failed to write-off imprest');
                }
            }).catch(err => {
                console.error('Error saving write-off:', err);
                if (err.response && err.response.data) {
                    const errorMsg = err.response.data.message || err.response.data.Message || 'An error occurred while saving';
                    this.toastHandler('error', errorMsg);
                } else {
                    this.toastHandler('error', 'Failed to write-off imprest. Please try again.');
                }
            }).finally(() => {
                this.isSubmitting = false;
                this.isShimmerLoading = false;
            });
        },

        resetForm() {
            this.imprestForm = {
                imprestId: '',
                categoryId: '',
                categoryName: '',
                amountDisbursed: 0,
                outstanding: 0,
                writeOffDate: new Date().toISOString().split('T')[0],
                amount: 0,
                currencyId: this.currencyList.length > 0 ? this.currencyList[0].id : '',
                rate: 0,
                authorizedBy: '',
                writtenOffBy: '',
                debitAccountId: '',
                creditAccountId: ''
            };
            this.errors = {};
            this.selectedEmployee = null;
            this.employeeImprests = [];
            this.employeeSearch = '';
            this.filteredEmployeeList = this.employeeList.slice();
            this.toastHandler('success', 'Form has been reset');
        },

        cancelForm() {
            if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
                window.location.href = '/LedgerDataEntry/Imprest';
            }
        }
    },

    computed: {
        employeeCount() {
            return this.filteredEmployeeList ? this.filteredEmployeeList.length : 0;
        }
    },

    watch: {
        'imprestForm.currencyId': function (newVal) {
            if (newVal) {
                const currency = this.currencyList.find(c => c.id === newVal);
                if (currency) {
                    this.imprestForm.rate = currency.buyRate ?? 0;
                } else {
                    this.imprestForm.rate = 0;
                }
            }
        }
    },

    created() {
        this.getEmployees();
        this.getCurrencies();
        this.getLedgerAccounts();

    }
});
