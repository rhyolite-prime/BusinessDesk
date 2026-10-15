 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        employeeList: [],
        
        tenantId: 0
    },
    
    methods: {

        getEmployees() {

            axios.get('/PayrollDataEntry/GetEmployees').then(response => {

                response.data.forEach(v => {

                    v.employeeName = v.otherName === '' || null ? `${v.firstName} ${v.lastName} - ${v.employeeIdentifier}` : `${v.firstName} ${v.lastName} ${v.otherName} - ${v.employeeIdentifier}`
                });

                this.renderTable(response.data);
                 

            }).catch(err => {

                //console.log(err);
            });
        },

         
        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [  ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "employeeIdentifier", headerText: "Employee ID", validationRules: { required: true, minlength: 1 }, width: 50, },
                    { field: "employeeName", headerText: "Employee Name", validationRules: { required: true, minlength: 1 }, width: 95, },
                    { field: "categoryName", headerText: "Category", validationRules: { date: true }, width: 55, },
                    { field: "departmentName", headerText: "Department", validationRules: { date: true }, width: 85, },

                ],
                endDelete: (args) => {

                },
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

        salaryGradeId(val) {

            if (val) {

                let salaryGrade = this.getSalaryGradeDetails(val);

                if (salaryGrade) {

                    this.salaryNotchList = salaryGrade.salaryNotches;
                }

            }

        },

        employeeId(val) {

            if (val) {

                this.setCurrentEmployee();

            }

        }

    },
    created() {

        this.getEmployees();
        

    },
});