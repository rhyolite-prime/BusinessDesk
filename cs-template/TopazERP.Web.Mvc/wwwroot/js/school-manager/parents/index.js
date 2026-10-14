
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},

    },

    methods: {

        getParents() {

            axios.get('/Parents/GetParentAndWards').then(response => {

              
                this.renderTable(response.data.parents, response.data.wards);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get parents.');

            });
        },

        renderTable(responseData1, responseData2) {

            $("#dataTable").ejGrid({
                dataSource: responseData1,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                allowGrouping: true,
                enableDropAreaAnimation: true,
                editSettings: { allowDeleting: true, showDeleteConfirmDialog: true },
                childGrid: {
                    dataSource: responseData2,
                    queryString: "id",
                    allowPaging: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    columns: [

                        { field: "studentId", headerText: 'studentId', isPrimaryKey: true, visible: false, textAlign: ej.TextAlign.Left, width: 10 },
                        { field: "studentIdentifier", headerText: 'Student ID', textAlign: ej.TextAlign.Left, width: 55 },
                        { field: "studentName", headerText: 'Student Name', textAlign: ej.TextAlign.Left, width: 85 },
                        { field: "className", headerText: 'Class', textAlign: ej.TextAlign.Left, width: 55 },
                    ]

                },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Delete, ej.Grid.ToolBarItems.Search, ej.Grid.ToolBarItems.Update, ej.Grid.ToolBarItems.Cancel] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { field: "firstGuardianName", headerText: "1st Gua' Name", validationRules: { required: true, minlength: 1 }, width: 65, allowEditing: false },
                    { field: "firstGuardianPhoneNo", headerText: "1st Gua' Phone#", validationRules: { required: true, minlength: 1 }, width: 65, },
                    { field: "firstGuardianEmail", headerText: "1st Gua' Email", validationRules: { date: true }, width: 55, },
                    { field: "firstGuardianProfession", headerText: "1st Gua' Profession", validationRules: { date: true }, width: 75, },
                    { field: "secondGuardianName", headerText: "2nd Gua' Name", validationRules: { required: true, minlength: 1 }, width: 65, },
                    { field: "secondGuardianPhoneNo", headerText: "2nd Gua' Phone#", validationRules: { required: true, minlength: 1 }, width: 65, },
                    { field: "secondGuardianEmail", headerText: "2nd Gua' Email", validationRules: { date: true }, width: 65, },
                    { field: "secondGuardianProfession", headerText: "2nd Gua' Profession", validationRules: { date: true }, width: 75, },

                ],
                recordDoubleClick: (args) => {
                    this.viewParentDetails(args.data.id);
                },
                endDelete: (args) => {
                    this.delParent(args.data.id);
                },
            });

        },
        viewParentDetails(payload) {

            axios.get('/Staff/GetStaffDetails?id=' + payload.id).then(response => {

                console.log(response.data);

                //$("#stafffDetail").modal('show');


            }).catch(err => {

                this.toastHandler('error', 'Unable to get staff details.');

            });

        },
        delParent(id) {

            axios.get('/Parents/DelParent?id=' + id).then(response => {

                this.getParents();

                this.toastHandler('', 'Parent deleted.');

            }).catch(err => {

                this.toastHandler('error', 'Unable to delete staff.');

            });
        },
        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");

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

        this.getParents();
    },
});