
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        schClasses: [],
        studentList: [],
        selectedClassId: '',
        selectedStudentId: '',
        schClasses: [],
        selectedParentList: []

    },
    
    methods: {

        assignParentWard() {


            this.setWardsParent();

            console.log(this.selectedParentList);

            if (this.selectedParentList.length > 1) {

                this.toastHandler('warning', 'A student can be assigned to only one guardian at a time.');

                return;
            }
            else if (!this.selectedParentList.length) {

                this.toastHandler('warning', 'Select a guardian');
                return;

            }
            else {

                this.isLoading = true;

                this.payload = {};

                this.payload.studentId = this.selectedStudentId;

                this.payload.parentId = this.selectedParentList[0].id;

                axios.post('/Parents/CreateOrUpdateParentStudentMapping', this.payload).then((response) => {

                    this.toastHandler('', 'Student/Guardian relationship has been established !');

                }).catch((error) => {

                    console.log(error);
                });

            }


        },
        getParents() {

            axios.get('/Parents/GetParents').then(response => {

                this.renderTable(response.data);

            }).catch(err => {

                this.toastHandler('error', 'Unable to get parents.');

            });
        },


        renderTable(responseData) {

            $("#dataTable").ejGrid({

                dataSource: responseData,
                allowPaging: true,
                allowSorting: true,
                isResponsive: true,
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search, ej.Grid.ToolBarItems.Print] },
                columns: [

                    { field: "id", headerText: "Id", width: 75, visible: false, isPrimaryKey: true, },
                    { type: "checkbox", width: 20 },
                    { field: "firstGuardianName", headerText: "1st Guardian Name", validationRules: { required: true, minlength: 1 }, width: 65, allowEditing: false },
                    { field: "secondGuardianName", headerText: "2nd Guardian Name", validationRules: { required: true, minlength: 1 }, width: 65, },
                    { field: "firstGuardianPhoneNo", headerText: "1st Guardian Phone#", validationRules: { required: true, minlength: 1 }, width: 55, },
                    { field: "firstGuardianEmail", headerText: "1st Guardian Email", validationRules: { date: true }, width: 55, },
                    { field: "secondGuardianEmail", headerText: "2nd Guardian Email", validationRules: { date: true }, width: 55, },

                ]

            });

        },

        getSchClasses() {

            axios.get('/schsetups/GetClasses').then(response => {

                this.schClasses = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get classes.');

            });
        },

        getStudents() {

            axios.get('/Students/GetStudentByClass?id=' + this.selectedClassId).then(response => {

                this.studentList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get students.');

            });

        },

        setWardsParent() {

            var obj = $("#dataTable").ejGrid("instance"), rec = [];
            this.selectedParentList = [];
            var check = obj.checkSelectedRowsIndexes;  // collection which holds the page index and the selected record index

            if (check.length) {
                for (var pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getRecords(pageInx, check[pageInx], obj, rec);
                }
            }

            this.selectedParentList = rec;
        },
        getRecords(pageInx, inx, proxy, rec) {

            if (inx.length) {
                for (var i = 0; i < inx.length; i++) {
                    var pageSize = proxy.model.pageSettings.pageSize;  //gets the page size of grid
                    var data = proxy.model.dataSource[pageInx * pageSize + inx[i]];
                    rec.push(data);     //pushing all the selected Records
                }
            }
            return rec;

        },

        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");

        },

        formatShortDate(dateInput) {

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
    computed: {

        classList() {

            this.schClasses.forEach((v) => {

                if (v.streamId != '00000000-0000-0000-0000-000000000000') {
                    v.className = v.className + '-' + v.streamName;
                }

            });

            return this.schClasses;
        },

        displayChequeInput() {

            return this.modeOfPayment == 'Cheque';
        }
    },
    watch: {

        selectedClassId(val) {

            this.getStudents();
        },

        
    },
    created() {

        this.getParents();

        this.getSchClasses();
    },
});