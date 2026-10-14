 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
    },
    
    methods: {

        getEmployeeSsnitInfo() {

            axios.get('/PayrollEnquiries/GetEmployeeSsnitInfo').then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to fetch provident fund details');

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
                    { field: "providentFundEmployeeContribution", format: "{0:n2}", headerText: "Employee PF (%)", width: 55 },
                    { field: "providentFundEmployerContribution", format: "{0:n2}", headerText: "Employer PF (%)", width: 55 },
                    { field: "secondProvidentFundEmployeeContribution", format: "{0:n2}", headerText: "2nd Employee PF (%)", width: 55 },
                    { field: "secondProvidentFundEmployerContribution", format: "{0:n2}", headerText: "2nd Employer PF (%)", width: 55 },

                    
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
    created() {

        this.getEmployeeSsnitInfo();
    },
});