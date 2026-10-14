 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        tenantId: 0
    },
    
    methods: {

        getPastLoans() {

            axios.get('/PayrollEnquiries/GetPastLoans').then(response => {

                response.data.loans.forEach((v) => {

                    v.employeeLoanId = v.id;
                    v.loanDate = this.formatDate(v.loanDate);
                    v.deductionStarts = this.formatDate(v.deductionStarts);

                });

                response.data.repaymentSchedule.forEach((v) => {

                    v.scheduleDate = this.formatDate(v.scheduleDate);

                });

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
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "employeeIdentifier", headerText: "Employee ID", validationRules: { required: true, minlength: 1 }, width: 50, },
                    { field: "employeeName", headerText: "Employee Name", validationRules: { required: true, minlength: 1 }, width: 95, },
                    { field: "loanTypeName", headerText: "Loan Type", format: "{0:n2}", width: 65, },
                    { field: "loanDate", headerText: "Loan Date", width: 55, },
                    { field: "deductionStarts", headerText: "Ded'ion Starts", width: 65, },
                    { field: "amount", headerText: "Amount", format: "{0:n2}", width: 45, },
                    { field: "annualInterestRate", headerText: "Rate(%)", format: "{0:n2}", width: 45, },
                    { field: "duration", headerText: "Duration(Months)", width: 65, },
                    { field: "monthlyDeduction", headerText: "Monthly Deduction", format: "{0:n2}", width: 45, },
                    { field: "currentBalance", headerText: "Curr. Balance", width: 65, },
                    { field: "loanStatus", headerText: "Loan Status", format: "{0:n2}", width: 65, },

                ],


                childGrid: {
                    dataSource: responseData.repaymentSchedule,
                    queryString: "employeeLoanId",
                    allowPaging: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    sortSettings: { sortedColumns: [{ field: "period", direction: "ascending" }] },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Search] },
                    columns: [

                        { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                        { field: "employeeLoanId", visible: false, headerText: "id", width: 'auto', },
                        { field: "scheduleDate", headerText: "Schedule Date", width: 55, },
                        { field: "period", headerText: "Period", width: 35, },
                        { field: "monthlyPayment", headerText: "Monthly Payment", width: 55, },
                        { field: "principalPayment", headerText: "Principal Payment", width: 55, },
                        { field: "interestPayment", headerText: "Interest Payment", width: 55, },
                        { field: "interestPlusPrincipalBalance", headerText: "Interest + Principal Balance", width: 55, },
                    ],

                },

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

        this.getPastLoans();
    },
});