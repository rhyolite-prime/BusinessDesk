 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        
        tenantId: 0
    },
    
    methods: {

        getEmployeeAllowances() {

            axios.get(`/PayrollEnquiries/GetEmployeeAllowances`).then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to fetch employee allowances');

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
                    { field: "employeeIdentifier", headerText: "Employee ID", width: 50, },
                    { field: "employeeName", headerText: "Employee Name", width: 75 },
                    { field: "allowanceTypeName", headerText: "Allowance Type", width: 65 },
                    { field: "taxable", headerText: "Taxable ?", displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', width: 40, },
                    { field: "sSF", headerText: "SSF", displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', width: 35, },
                    { field: "providentFund", headerText: "Provident Fund", displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', width: 45, },
                    { field: "isMonthly", headerText: "Is Monthly/Daily ?", displayAsCheckbox: true, editType: ej.Grid.EditingType.Boolean, type: 'boolean', width: 55, },
                    { field: "amount", headerText: "Amount", format: "{0:n2}", width: 45, },
                    { field: "allowanceDays", headerText: "Allowance Days", width: 55, },
                ]
                 
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

    },
    created() {

        this.getEmployeeAllowances();
        

    },
});