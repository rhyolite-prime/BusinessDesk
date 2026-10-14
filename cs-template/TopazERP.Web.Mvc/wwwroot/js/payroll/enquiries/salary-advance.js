 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        tenantId: 0
    },
    
    methods: {

        getSalaryAdvances() {

            axios.get('/PayrollEnquiries/GetEmployeeSalaryAdvances').then(response => {

                response.data.forEach((v) => {

                    v.loanDate = this.formatDate(v.loanDate);

                });

                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to fetch salary advances.');

            });
        },

        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");

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
                    { field: "loanTypeName", headerText: "Loan Type", width: 70 },
                    { field: "loanDate", headerText: "Loan Date", width: 65 },
                    { field: "amount", format: "{0:n2}", headerText: "Amount", width: 55 },

                    
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

        this.getSalaryAdvances();
    },
});