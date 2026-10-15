 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        tenantId: 0
    },
    
    methods: {

        getOutstandingLoans() {

            axios.get('/PayrollEnquiries/GetOutstandingLoans').then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to fetch outstanding loans.');

            });
        },

         
        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                toolbarSettings: { showToolbar: true, toolbarItems: [ ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "employeeIdentifier", headerText: "Employee ID", width: 50, },
                    { field: "employeeName", headerText: "Employee Name", width: 95, },
                    { field: "loanTypeName", headerText: "Loan Type", format: "{0:n2}", width: 65, },
                    { field: "loanDate", headerText: "Loan Date", width: 55, },
                    { field: "deductionStarts", headerText: "Deduction Date", format: "{0:n2}", width: 65, },
                    { field: "amount", headerText: "Amount", format: "{0:n2}", width: 50, },
                    { field: "annualInterestRate", headerText: "Rate(%)", width: 45, },
                    { field: "duration", headerText: "Duration(Months)", width: 65, },
                    { field: "monthlyDeduction", headerText: "Monthly Deduction", format: "{0:n2}", width: 45, },
                    { field: "currentBalance", headerText: "Current Balance", format: "{0:n2}", width: 65, },
                    { field: "isApproved", headerText: "Is Approved?", displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', width: 65, },

                    
                ],
                 
            });

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

        this.getOutstandingLoans();
    },
});