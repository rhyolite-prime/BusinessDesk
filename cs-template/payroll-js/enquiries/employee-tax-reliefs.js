 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        tenantId: 0
    },
    
    methods: {

        getEmployeeBiks() {

            axios.get(`/PayrollEnquiries/GetEmployeeTaxReliefs`).then(response => {

                response.data.employees.forEach(v => {

                    v.employeeId = v.id;

                    v.employeeName = v.otherName == '' || null ? `${v.firstName} ${v.lastName}` : `${v.firstName} ${v.lastName} ${v.otherName}`;

                });

                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to fetch employee benefits in kind.');
            });

        },

         
        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData.employees,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                editSettings: { allowDeleting: true, showDeleteConfirmDialog: true },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Cancel,] },
                columns: [
                    { field: "employeeId", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                    { field: "employeeIdentifier", headerText: "Employee ID", width: 'auto', allowEditing: false },
                    { field: "employeeName", headerText: "Employee Name", width: 'auto', allowEditing: false },
                ],

                childGrid: {
                    dataSource: responseData.employeeTaxReliefs,
                    queryString: "employeeId",
                    allowPaging: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    editSettings: { allowEditing: true, allowAdding: true, allowDeleting: true, showDeleteConfirmDialog: true },
                    toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Add, ej.Grid.ToolBarItems.Edit, ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel, ej.Grid.ToolBarItems.Search] },
                    columns: [

                        { field: "id", isPrimaryKey: true, visible: false, headerText: "id", width: 'auto', },
                        { field: "employeeId", visible: false, headerText: "id", width: 'auto', },
                        { field: "reliefTypeName", headerText: "Tax Relief", width: 55, },
                        { field: "amount", headerText: 'Amount', textAlign: ej.TextAlign.Left, width: 55, },

                    ],
                     
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

       

    },
    created() {

        this.getEmployeeBiks();
        

    },
});