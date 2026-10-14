 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        month: 1,
        year: new Date().getFullYear(),
    },
    
    methods: {

        getData() {

            axios.get(`/PayrollEnquiries/GetPastSsfContributions?month=${this.month}&year=${this.year}`).then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to fetch ssf contributions');

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

        month(val) {

            this.getData();

        },
        year(val) {

            this.getData();

        },


    },
    created() {

        this.getData();
    },
});