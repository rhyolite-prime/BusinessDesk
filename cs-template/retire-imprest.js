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
        costCenterHierachyList: [],

        imprestForm: {
            imprestId: '',
            categoryId: '',
            categoryName: '',
            amountDisbursed: 0,
            outstanding: 0,

            retirementDate: new Date().toISOString().split('T')[0],
            editMode: '',
            amountRetired: 0,
            currencyId: '',
            rate: 0,
            retiredBy: '' // Or current user context
        },
        
        retirementDetails: [],
        
        errors: {},
        isSubmitting: false
    },

    methods: {
        getEmployees() {
            this.isShimmerLoading = true;
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
            let costCenterList = dataArr;
            let costCenterHierachyList = [];
            let costCenterNameList = [];

            const getHierachyName = (id) => {
                let parentId;
                let returnName;

                costCenterList.forEach(item => {
                    if (item.id === id) {
                        parentId = item.parentId;
                        returnName = item.name;
                    }
                });

                if (parentId) {
                    const parentItem = costCenterList.find(item => item.id === parentId);
                    if (parentItem) {
                        const parentName = getHierachyName(parentId);
                        costCenterNameList.push(parentName);
                    }
                }

                costCenterNameList.push(returnName);
                return returnName;
            };

            for (let i = 0; i < costCenterList.length; i++) {
                getHierachyName(costCenterList[i].id);
                let name = [...new Set(costCenterNameList)].join().replace(/,/g, '/');

                costCenterHierachyList.push({
                    name: name,
                    parentId: costCenterList[i].parentId,
                    id: costCenterList[i].id,
                    rawName: costCenterList[i].name,
                    tenantId: costCenterList[i].tenantId,
                });

                costCenterNameList = [];
            }

            return costCenterHierachyList;
        },

        getAllImprests() {
            this.isShimmerLoading = true;
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
            this.employeeImprests = this.allImprests.filter(imp => imp.employeeId === employee.id && imp.balance > 0);
            this.resetImprestSelection();
            this.toastHandler('success', `Selected: ${employee.firstName} ${employee.lastName}`);
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
            this.retirementDetails = [];
            this.addDetailRow(); // add empty row
        },

        onImprestChange() {
            this.selectedImprest = this.employeeImprests.find(i => i.id === this.imprestForm.imprestId);
            if (this.selectedImprest) {
                this.imprestForm.categoryId = this.selectedImprest.imprestCategoryId;
                this.imprestForm.categoryName = this.selectedImprest.imprestCategoryName;
                this.imprestForm.amountDisbursed = this.selectedImprest.amount || 0;
                this.imprestForm.outstanding = this.selectedImprest.balance || 0;
                
                if (this.retirementDetails.length === 0) {
                    this.addDetailRow();
                }
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
        
        addDetailRow() {
            this.retirementDetails.push({
                receiptDate: new Date().toISOString().split('T')[0],
                receiptNo: '',
                description: '',
                amount: 0,
                debitAccountId: '',
                creditAccountId: '',
                ouId: ''
            });
        },
        
        removeDetailRow(index) {
            if (this.retirementDetails.length > 1) {
                this.retirementDetails.splice(index, 1);
            } else {
                this.toastHandler('warning', 'At least one detail row is required.');
            }
        },

        validateForm() {
            this.errors = {};
            let isValid = true;

            if (!this.selectedEmployee) {
                this.errors.employee = 'Please select an employee';
                isValid = false;
            }

            if (!this.imprestForm.imprestId) {
                this.errors.imprestId = 'Please select an imprest to retire';
                isValid = false;
            }

            if (this.imprestForm.amountRetired <= 0) {
                this.errors.amount = 'Total amount retired must be greater than 0';
                isValid = false;
            }

            if (this.imprestForm.amountRetired > this.imprestForm.outstanding) {
                this.errors.amountExceeds = 'Total amount retired cannot exceed outstanding balance';
                isValid = false;
            }

            if (!this.imprestForm.currencyId) {
                this.errors.currencyId = 'Currency is required';
                isValid = false;
            }
            
            // Validate Details
            if (this.retirementDetails.length === 0) {
                this.errors.details = 'At least one retirement detail is required';
                isValid = false;
            }
            
            let hasDetailError = false;
            this.retirementDetails.forEach((detail, index) => {
                if (!detail.amount || detail.amount <= 0) hasDetailError = true;
                if (!detail.debitAccountId) hasDetailError = true;
                if (!detail.creditAccountId) hasDetailError = true;
            });
            
            if (hasDetailError) {
                this.errors.detailsValidation = 'Please complete all required fields in the retirement details (Amount > 0, Debit G/L, Credit G/L)';
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

        saveRetirement() {
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
                retirementDate: this.imprestForm.retirementDate,
                amountRetired: this.imprestForm.amountRetired,
                currencyId: this.imprestForm.currencyId,
                rate: this.imprestForm.rate,
                retiredBy: this.imprestForm.retiredBy,
                details: this.retirementDetails
            };

            // Assuming endpoint exists or will exist: /LedgerDataEntry/RetireImprestPost
            axios.post('/LedgerDataEntry/RetireImprestPost', payload).then(response => {
                if ((response.data && response.data.success) || response.data === 200) {
                    this.toastHandler('success', 'Imprest retired successfully!');
                    setTimeout(() => {
                        window.location.href = '/LedgerDataEntry/Imprest';
                    }, 2000);
                } else {
                    this.toastHandler('error', response.data.message || 'Failed to retire imprest');
                }
            }).catch(err => {
                console.error('Error saving retirement:', err);
                if (err.response && err.response.data) {
                    const errorMsg = err.response.data.message || err.response.data.Message || 'An error occurred while saving';
                    this.toastHandler('error', errorMsg);
                } else {
                    this.toastHandler('error', 'Failed to retire imprest. Please try again.');
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
                retirementDate: new Date().toISOString().split('T')[0],
                editMode: '',
                amountRetired: 0,
                currencyId: this.currencyList.length > 0 ? this.currencyList[0].id : '',
                rate: 0,
                retiredBy: ''
            };
            this.errors = {};
            this.selectedEmployee = null;
            this.employeeImprests = [];
            this.retirementDetails = [];
            this.employeeSearch = '';
            this.filteredEmployeeList = this.employeeList.slice();
            this.addDetailRow();
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
        },
        computedTotalRetired() {
            let total = 0;
            if (this.retirementDetails && this.retirementDetails.length > 0) {
                total = this.retirementDetails.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
            }
            this.imprestForm.amountRetired = total;
            return total;
        }
    },

    watch: {
        'imprestForm.currencyId': function(newVal) {
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
        this.getOus();
        this.getAllImprests();
        this.addDetailRow();
    }
});
