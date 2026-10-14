Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;

 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        approvedLoansList: [],
        employeeId: '',
        currentLoanId: '',
        tenantId: '',
        loanTypeList: [],
        loanDate: '',
        amount: null,
        loanTypeId: '',
        lastDeductionDate: '',
        ledgerAccountList: [],
        bankGlAccountId: '',
        selectedLoanRecord: {},
        loanRepaymentSummary: {},
        amountPaid: null

    },
    validations() {

        return {

            currentLoanId: {
                required
            },
           
            amountPaid: {
                required,
                minValue: minValue(0.1),
            },
 
        }

    },
    methods: {
 
        getLoanTypes() {

            axios.get('/PayrollSetups/GetLoanTypes').then(response => {
 
                this.loanTypeList = response.data
                
            }).catch(err => {

                //console.log(err);
            });

        },

        getApprovedEmployeeLoans() {

            axios.get('/PayrollDataEntry/GetApprovedLoans').then(response => {

                this.approvedLoansList = response.data;

                response.data.forEach((v) => {


                    v.loanTitle = v.employeeName + ' , Amount: ' + v.amount + ' , Balance: ' + v.currentBalance

                });

                $("#employeeId").ejDropDownList({
                    dataSource: response.data,
                    watermarkText: "Select Loan",
                    width: "100%",
                    fields: { id: "id", text: "loanTitle", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {

                        this.currentLoanId = args.value;
                    }

                });

            }).catch(err => {

                //console.log(err);
            });

        },

        getLoanTypes() {

            axios.get('/PayrollSetups/GetLoanTypes').then(response => {

                this.loanTypeList = response.data

            }).catch(err => {

                //console.log(err);
            });

        },

        getLoanRepaymentSummary() {

            axios.get('/PayrollDataEntry/GetLoanRepaymentSummary?loanId=' + this.currentLoanId).then(response => {

                this.loanRepaymentSummary = response.data;

            }).catch(err => {

                //console.log(err);
            });

        },


        getLedgerAccounts() {

            axios.get('/LedgerSetups/GetLedgerAccounts').then(response => {

                this.ledgerAccountList = response.data;

                $("#bankGlAccountId").ejDropDownList({
                    dataSource: response.data,
                    watermarkText: "Select Account",
                    width: "100%",
                    fields: { id: "id", text: "accountName", value: "id" },
                    enableFilterSearch: true,
                    change: (args) => {

                        this.bankGlAccountId = args.value;
                    }

                });

            }).catch(err => {

                this.toastHandler('error', 'Unable to get ledger accounts.');

            });
        },

        amortizeLoan() {

            this.$v.$touch();

            if (this.$v.$invalid) {

                for (let key in Object.keys(this.$v)) {

                    const input = Object.keys(this.$v)[key];

                    if (this.$v[input].$error) {

                        this.$refs[input].focus();

                        break;
                    }

                }

                return;
            }  

            if (this.selectedLoanRecord.currentBalance == 0) {

                this.toastHandler('warning', 'This loan has no outstanding balance. It cannot be amortized');

                return;
            }

            let payload = {};

            this.isLoading = true;

            payload.amountPaid = this.amountPaid;

            payload.bankGlAccountId = !this.bankGlAccountId ? this.emptyGuid : this.bankGlAccountId ;

            payload.employeeLoanId = this.currentLoanId;

                
            axios.post('/PayrollDataEntry/AmortizeLoan', payload).then(response => {

                this.toastHandler('', 'Loan Amortization processed successfully.');
                this.isLoading = false;

            }).catch(err => {

                this.toastHandler('error', 'Unable to amortize employee loan.');
                this.isLoading = false;

            });
            
            
        },
        
        getLoanTypeDetails(id) {

            return this.loanTypeList.find(a => a.id === id);
        },

        getLoanDetails(id) {

            return this.approvedLoansList.find(a => a.id === id);
        },

        initControls() {

            $( () => {

                $("#loanDate").ejDatePicker({
                    width: "100%",
                    value: new Date(),
                    dateFormat: "dd-MMM-yyyy",
                    change: (args) => {
                        if (args.value) {

                            this.loanDate = args.value
                        }
                    }

                });
            });


            $(() => {

                $("#lastDeductionDate").ejDatePicker({
                    width: "100%",
                    value: new Date(),
                    dateFormat: "dd-MMM-yyyy",
                    change: (args) => {
                        if (args.value) {

                            this.lastDeductionDate = args.value
                        }
                    }

                });
            });

        },


        formatShortDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
        },

        toastHandler(type, message = 'An unexpected error occurred.') {

            //display alert with 
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

        
    },
    watch: {

        currentLoanId(val) {

            if (val) {

                this.selectedLoanRecord = this.getLoanDetails(val);

                this.selectedLoanRecord.creationTime = this.formatShortDate(this.selectedLoanRecord.creationTime);

                this.getLoanRepaymentSummary();
            }
        },
        
    },
    created() {

        this.initControls();
        this.getApprovedEmployeeLoans();
        this.getLedgerAccounts();
        this.getLoanTypes();

    },
});