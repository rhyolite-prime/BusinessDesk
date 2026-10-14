let vue = new Vue({
    el: '#app',
    data: {
        isShimmerLoading: false,
        payload: {},
        imprestCategoryId: '',
        currencyList: [],
        imprestCategoryList: [],
        accountsList: [],
        employeeList: [],
        filteredEmployeeList: [],
        selectedEmployee: null,
        employeeSearch: '',
        costCenterHierachyList: [],
        costCenterList: [],
        costCenterNameList: [],
        imprestForm: {
            imprestCategoryId: '',
            employeeId: '',
            disbursementDate: new Date().toISOString().split('T')[0],
            expectedRetirementDate: (() => {
                let d = new Date();
                d.setUTCMonth(d.getUTCMonth() + 1);
                return d.toISOString().split('T')[0];
            })(),
            amount: null,
            currencyId: '',
            creditAccountId: '',
            debitAccountId: '',
            description: '',
            ouId: '',
            imprestNo: '',
            paymentMethod: 'Cash',
            referenceNo: '',
            outstanding: 0,
            buyRate: 0,
            sellRate: 0
        },
        errors: {},
        isSubmitting: false
    },

    methods: {

        getImprestCategory() {
            this.isShimmerLoading = true;
            return axios.get('/LedgerSetups/GetImprestCategories/').then(response => {
                this.imprestCategoryList = response.data;
            }).catch(err => {
                this.toastHandler('error', 'Unable to retrieve imprest categories');
            }).finally(() => {
                this.isShimmerLoading = false;
            });
        },

        getImprestSystemNumber() {
            this.isShimmerLoading = true;
            return axios.get('/SharedResource/GetSystemNumberInfo?systemName=ImprestNo').then(response => {
                console.log(response.data);
                if (response.data) {
                    const prefix = response.data.prefix || '';
                    const lastNo = response.data.lastNo || '';
                    const suffix = response.data.suffix || '';
                    this.imprestForm.imprestNo = `${prefix}${lastNo}${suffix}`;
                }
            }).catch(err => {
                this.toastHandler('error', 'Unable to retrieve system number');
            }).finally(() => {
                this.isShimmerLoading = false;
            });
        },

        getCurrencies() {
            this.isShimmerLoading = true;
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

        getEmployees() {
            this.isShimmerLoading = true;
            return axios.get('/PayrollDataEntry/GetEmployees').then(response => {
                this.employeeList = response.data;
                // Display all employees by default
                this.filteredEmployeeList = this.employeeList.slice();
                console.log('Employees loaded:', this.employeeList.length);
            }).catch(err => {
                console.error('Error loading employees:', err);
                this.toastHandler('error', 'Unable to retrieve employees');
                // Set empty arrays to prevent errors
                this.employeeList = [];
                this.filteredEmployeeList = [];
            }).finally(() => {
                this.isShimmerLoading = false;
            });
        },

        getLedgerAccounts() {
            this.isShimmerLoading = true;
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

        getOus() {
            this.isShimmerLoading = true;
            axios.get('/SharedResource/GetCostCenters').then(response => {
                this.costCenterHierachyList = this.parseCostCenterHierachy(response.data);
            }).catch(err => {
                console.log(err);
                this.toastHandler('error', 'Failed to retrieve organization units.');
            }).finally(() => {
                this.isShimmerLoading = false;
            });
        },

        parseCostCenterHierachy(dataArr) {
            this.costCenterList = dataArr;
            let costCenterHierachyList = [];

            for (let i = 0; i < this.costCenterList.length; i++) {
                this.getHierachyName(this.costCenterList[i].id);
                let name = [...new Set(this.costCenterNameList)].join().replace(/,/g, '/');

                costCenterHierachyList.push({
                    name: name,
                    parentId: this.costCenterList[i].parentId,
                    id: this.costCenterList[i].id,
                    rawName: this.costCenterList[i].name,
                    tenantId: this.costCenterList[i].tenantId,
                });

                this.costCenterNameList = [];
            }

            return costCenterHierachyList;
        },

        getHierachyName(id) {
            let parentId;
            let returnName;

            this.costCenterList.forEach(item => {
                if (item.id === id) {
                    parentId = item.parentId;
                    returnName = item.name;
                }
            });

            if (parentId) {
                const parentItem = this.costCenterList.find(item => item.id === parentId);
                if (parentItem) {
                    const parentName = this.getHierachyName(parentId);
                    this.costCenterNameList.push(parentName);
                }
            }

            this.costCenterNameList.push(returnName);
            return returnName;
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

        validateForm() {
            this.errors = {};
            let isValid = true;

            if (!this.selectedEmployee) {
                this.errors.employee = 'Please select an employee';
                isValid = false;
            }

            if (!this.imprestForm.imprestCategoryId) {
                this.errors.imprestCategoryId = 'Imprest Category is required';
                isValid = false;
            }

            if (!this.imprestForm.amount || this.imprestForm.amount <= 0) {
                this.errors.amount = 'Valid Amount is required';
                isValid = false;
            }

            if (!this.imprestForm.currencyId) {
                this.errors.currencyId = 'Currency is required';
                isValid = false;
            }

            if (!this.imprestForm.creditAccountId) {
                this.errors.creditAccountId = 'Bank G/L is required';
                isValid = false;
            }

            if (!this.imprestForm.debitAccountId) {
                this.errors.debitAccountId = 'Debit G/L is required';
                isValid = false;
            }

            if (!this.imprestForm.ouId) {
                this.errors.ouId = 'Organization Unit is required';
                isValid = false;
            }

            if (!this.imprestForm.disbursementDate) {
                this.errors.disbursementDate = 'Disbursement Date is required';
                isValid = false;
            }

            if (this.imprestForm.creditAccountId === this.imprestForm.debitAccountId) {
                this.errors.accountMatch = 'Bank G/L and Debit G/L cannot be the same';
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

        filterEmployees() {
            // If search is empty, show all employees
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

            console.log(`Filtered ${this.employeeList.length} employees to ${this.filteredEmployeeList.length} results`);
        },

        selectEmployee(employee) {
            this.selectedEmployee = employee;
            this.imprestForm.employeeId = employee.id;
            // Optionally auto-fill OU if employee has department mapping
            // this.imprestForm.ouId = employee.departmentId;
            this.toastHandler('success', `Selected: ${employee.firstName} ${employee.lastName}`);
        },

        clearSelectedEmployee() {
            this.selectedEmployee = null;
            this.imprestForm.employeeId = '';
            // Reset search to show all employees
            this.employeeSearch = '';
            this.filteredEmployeeList = this.employeeList.slice();
        },

        getInitials(employee) {
            if (!employee) return '';
            const first = (employee.firstName || '').charAt(0);
            const last = (employee.lastName || '').charAt(0);
            return `${first}${last}`.toUpperCase();
        },

        formatDate(dateString) {
            if (!dateString) return 'N/A';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        },

        saveImprest() {
            if (this.isSubmitting) return;

            if (!this.validateForm()) {
                this.showValidationErrors();
                return;
            }

            this.isSubmitting = true;
            this.isShimmerLoading = true;

            // Resolve lookup display names from in-memory lists
            const selectedCategory = this.imprestCategoryList.find(ic => ic.id === this.imprestForm.imprestCategoryId);
            const creditAccount   = this.accountsList.find(a => a.id === this.imprestForm.creditAccountId);
            const debitAccount    = this.accountsList.find(a => a.id === this.imprestForm.debitAccountId);
            const selectedOu      = this.costCenterHierachyList.find(ou => ou.id === this.imprestForm.ouId);
            const selectedCurrency = this.currencyList.find(c => c.id === this.imprestForm.currencyId);

            const payload = {
                // Employee
                employeeId:         this.imprestForm.employeeId,
                employeeIdentifier: this.selectedEmployee ? (this.selectedEmployee.employeeIdentifier || '') : '',
                employeeName:       this.selectedEmployee ? `${this.selectedEmployee.firstName || ''} ${this.selectedEmployee.lastName || ''}`.trim() : '',

                // Category
                imprestCategoryId:   this.imprestForm.imprestCategoryId,
                imprestCategoryName: selectedCategory ? selectedCategory.name : '',

                // Amounts
                amount:      this.imprestForm.amount,
                balance:     this.imprestForm.amount,

                // Dates
                disbursementDate:       this.imprestForm.disbursementDate,
                expectedRetirementDate: this.imprestForm.expectedRetirementDate,

                // Credit (Bank G/L)
                creditAccountId:   this.imprestForm.creditAccountId,
                creditAccountName: creditAccount ? creditAccount.accountIdentifier : '',

                // Payment
                paymentMethod: this.imprestForm.paymentMethod,
                chequeNo:      this.imprestForm.paymentMethod === 'Cheque' ? (this.imprestForm.chequeNo || '') : '',

                // Imprest number & reference
                imprestNo:   this.imprestForm.imprestNo,
                referenceNo: this.imprestForm.referenceNo,

                // Debit G/L
                debitAccountId:   this.imprestForm.debitAccountId,
                debitAccountName: debitAccount ? debitAccount.accountIdentifier : '',

                // Description
                description: this.imprestForm.description,

                // Organisation unit
                ouId:   this.imprestForm.ouId,
                ouName: selectedOu ? selectedOu.name : '',

                // Currency
                currencyId:   this.imprestForm.currencyId,
                currencyName: selectedCurrency ? selectedCurrency.currencyName : '',
                currencyCode: selectedCurrency ? (selectedCurrency.currencyCode || selectedCurrency.code || '') : '',

                // Rates
                buyRate:  this.imprestForm.buyRate  || 1,
                sellRate: this.imprestForm.sellRate || 1
            };

            axios.post('/LedgerDataEntry/CreateImprest', payload).then(response => {
                if ((response.data && response.data.success) || response.data === 200) {
                    this.toastHandler('success', 'Imprest created successfully!');
                    setTimeout(() => {
                        window.location.href = '/LedgerDataEntry/Imprest';
                    }, 2000);
                } else {
                    this.toastHandler('error', response.data.message || 'Failed to create imprest');
                }
            }).catch(err => {
                console.error('Error saving imprest:', err);
                if (err.response && err.response.data) {
                    const errorMsg = err.response.data.message || err.response.data.Message || 'An error occurred while saving';
                    this.toastHandler('error', errorMsg);
                } else {
                    this.toastHandler('error', 'Failed to create imprest. Please try again.');
                }
            }).finally(() => {
                this.isSubmitting = false;
                this.isShimmerLoading = false;
            });
        },

        resetForm() {
            this.imprestForm = {
                imprestCategoryId: '',
                employeeId: '',
                disbursementDate: new Date().toISOString().split('T')[0],
                expectedRetirementDate: (() => {
                    let d = new Date();
                    d.setUTCMonth(d.getUTCMonth() + 1);
                    return d.toISOString().split('T')[0];
                })(),
                amount: null,
                currencyId: this.currencyList.length > 0 ? this.currencyList[0].id : '',
                creditAccountId: '',
                debitAccountId: '',
                description: '',
                ouId: '',
                imprestNo: '',
                paymentMethod: 'Cash',
                referenceNo: '',
                outstanding: 0,
                buyRate: 0,
                sellRate: 0
            };
            this.errors = {};
            this.selectedEmployee = null;
            this.employeeSearch = '';
            // Show all employees again
            this.filteredEmployeeList = this.employeeList.slice();
            this.getImprestSystemNumber();
            this.toastHandler('success', 'Form has been reset');
        },

        cancelForm() {
            if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
                window.location.href = '/Imprest/List';
            }
        },

        getExchangeRate(currencyId) {
            // Placeholder for exchange rate fetching
            // axios.get(`/SharedResource/GetExchangeRate?currencyId=${currencyId}`).then(response => {
            //     if (response.data) {
            //         this.imprestForm.buyRate = response.data.buyRate || 1;
            //     }
            // }).catch(err => {
            //     console.error('Error fetching exchange rate:', err);
            //     this.imprestForm.buyRate = 1;
            // });
        }
    },

    computed: {
        formattedAmount() {
            if (this.imprestForm.amount) {
                return parseFloat(this.imprestForm.amount).toFixed(2);
            }
            return '0.00';
        },

        employeeCount() {
            return this.filteredEmployeeList ? this.filteredEmployeeList.length : 0;
        }
    },

    watch: {
        'imprestForm.disbursementDate': function(newVal) {
            if (newVal) {
                let d = new Date(newVal);
                d.setUTCMonth(d.getUTCMonth() + 1);
                this.imprestForm.expectedRetirementDate = d.toISOString().split('T')[0];
            }
        },
        'imprestForm.amount': function(newVal) {
            if (newVal && !isNaN(newVal)) {
                this.imprestForm.outstanding = parseFloat(newVal);
            } else {
                this.imprestForm.outstanding = 0;
            }
        },
        'imprestForm.currencyId': function(newVal) {
            if (newVal) {
                const currency = this.currencyList.find(c => c.id === newVal);
                if (currency) {
                    this.imprestForm.buyRate  = currency.buyRate  ?? 0;
                    this.imprestForm.sellRate = currency.sellRate ?? 0;
                } else {
                    this.imprestForm.buyRate  = 0;
                    this.imprestForm.sellRate = 0;
                }
            }
        }
    },

    created() {
        this.getEmployees();
        this.getCurrencies();
        this.getImprestCategory();
        this.getLedgerAccounts();
        this.getOus();
        this.getImprestSystemNumber();
    },
});