 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        approvalType: 'approve',
        employeeLoanList: [],
        selectedLoanList: [],

    },
    
    methods: {
         
        getPendingLoans() {

            axios.get('/PayrollDataEntry/GetPendingLoans').then(response => {

                response.data.loans.forEach((v) => {

                    v.employeeLoanId = v.id;
                    v.loanDate = this.formatDate(v.loanDate);
                    v.deductionStarts = this.formatDate(v.deductionStarts);

                });

                response.data.repaymentSchedule.forEach((v) => {

                    v.scheduleDate = this.formatDate(v.scheduleDate);

                });

                this.employeeLoanList = response.data.loans;

                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to fetch outstanding loans.');

            });
        },
         
        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData.loans,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "employeeIdentifier", headerText: "Employee ID",  validationRules: { required: true, minlength: 1 }, width: 50, },
                    { field: "employeeName", headerText: "Employee Name", validationRules: { required: true, minlength: 1 }, width: 105, },
                    { field: "loanTypeName", headerText: "Loan Type", format: "{0:n2}", width: 65, },
                    { field: "loanDate", headerText: "Loan Date", width: 55, },
                    { field: "deductionStarts", headerText: "Ded'ion Starts", width: 65, },
                    { field: "amount", headerText: "Amount", format: "{0:n2}", width: 45, },
                    { field: "annualInterestRate", headerText: "Rate(%)", format: "{0:n2}", width: 45, },
                    { field: "duration", headerText: "Duration(Months)", width: 65, },
                    { field: "monthlyDeduction", headerText: "Monthly Deduction", format: "{0:n2}", width: 45, },
                    { field: "status", headerText: "Status", width: 55, },

                ],
                endEdit: (args) => {

                    this.updateLoan(args.data);
                },
                endDelete: (args) => {

                    this.delLoan(args.data.id);
                },
                recordDoubleClick: (args) => {  
                        
                  console.log(args.data);
                  
                },
                childGrid: {
                    dataSource: responseData.repaymentSchedule,
                    queryString: "employeeLoanId",
                    allowPaging: true,
                    allowSorting: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    sortSettings: { sortedColumns: [{ field: "period", direction: "ascending" }] },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Search] },
                    columns: [

                        { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                        { field: "employeeLoanId", visible: false, headerText: "id", width: 'auto', },
                        { field: "scheduleDate", headerText: "Schedule Date", width: 55, },
                        { field: "period", headerText: "Period", width: 35, },
                        { field: "monthlyPayment", headerText: "Monthly Payment", format: "{0:n2}", width: 55, },
                        { field: "principalPayment", headerText: "Principal Payment", format: "{0:n2}", width: 55, },
                        { field: "interestPayment", headerText: "Interest Payment", format: "{0:n2}", width: 55, },
                        { field: "interestPlusPrincipalBalance", headerText: "Interest + Principal Balance", format: "{0:n2}", width: 55, },
                    ],

                },

            });

        },

        updateLoan(payload) {

            console.log(payload);
            
            this.isLoading = true;
            
            axios.post('/PayrollDataEntry/UpdateUnpaidEmployeeLoan', payload).then(response => {


                this.toastHandler('', 'Loan info & schedule updated.');
                this.isLoading = false;
                this.getPendingLoans();


            }).catch(err => {

                console.log(err);

                this.toastHandler('error', 'Unable to update loan status');
                this.isLoading = false;

            });

        },

        delLoan(id) {

            axios.get('/PayrollSetups/DelUnpaidEmployeeLoan?id=' + id).then(response => {

                this.getPendingLoans();

                this.toastHandler('', 'Employee loan deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete employee status.');

            });
        },

        formatDate(dateInput) {

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

        
    },
    created() {

        this.getPendingLoans();
    },
});