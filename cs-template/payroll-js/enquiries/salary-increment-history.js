 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        tenantId: 0
    },
    
    methods: {

        getEmployeeAllowances() {

            axios.get(`/PayrollEnquiries/GetSalaryIncrementHistory`).then(response => {

                response.data.forEach((v) => {

                    v.date = this.formatDateTime(v.creationTime);
                    

                });

                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to fetch salary increment history');

            });

        },

         
        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search] },

                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "employeeIdentifier", headerText: "Employee ID", validationRules: { required: true, minlength: 1 }, width: 50, },
                    { field: "employeeName", headerText: "Employee Name", width: 75 },
                    { field: "currentSalary", headerText: "Current Salary", format: "{0:n2}", width: 65, },
                    { field: "incrementAmount", headerText: "Increment Amount", format: "{0:n2}", width: 65, },
                    { field: "previousSalary", headerText: "Previous Salary", format: "{0:n2}", width: 65, },
                    { field: "date",   headerText: "Date", width: 65, },
                ]
                 
            });

        },

        formatDateTime(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY hh:mm A");

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

        salaryGradeId(val) {

            if (val) {

                let salaryGrade = this.getSalaryGradeDetails(val);

                if (salaryGrade) {

                    this.salaryNotchList = salaryGrade.salaryNotches;
                }

            }

        },

    },
    created() {

        this.getEmployeeAllowances();
        

    },
});