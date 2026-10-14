
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        academicYearList: [],
        termList: [],
        schClasses: [],
        billTypeList: [],
        studentList: [],
        selectedBillTypeId: '',
        selectedAcademicYearId: '',
        selectedTermId: '',
        selectedClassId: '',
        schClasses: [],

    },

    methods: {

        getData() {

            if (this.selectedAcademicYearId && this.selectedTermId && this.selectedClassId && this.selectedBillTypeId) {


                axios.get('/SchEnquiries/GetStudentBalances?academicYearId=' + this.selectedAcademicYearId + '&termId=' + this.selectedTermId + '&classId=' + this.selectedClassId + '&billTypeId=' + this.selectedBillTypeId).then(response => {

                    this.renderTable(response.data);

                }).catch(err => {

                    this.toastHandler('error', 'Unable to get student balances.');

                });


            }

           
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                pageSettings: { pageSize: 10 },
                isResponsive: true,
                allowGrouping: true,
                allowSorting: true,
                enableDropAreaAnimation: true,
                sortSettings: { sortedColumns: [{ field: "studentName", direction: "ascending" }] },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search, ej.Grid.ToolBarItems.PrintGrid] },
                editSettings: { allowDeleting: true, showDeleteConfirmDialog: true },
                columns: [

                    { field: "id", headerText: 'Id', isPrimaryKey: true, visible: false, textAlign: ej.TextAlign.Left, width: 10 },
                    { field: "studentIdentifier", headerText: 'Student ID', textAlign: ej.TextAlign.Left, width: 35 },
                    { field: "studentName", headerText: 'Student Name', textAlign: ej.TextAlign.Left, width: 95 },
                    { field: "billBalance", headerText: 'Balance', format: "{0:n2}", textAlign: ej.TextAlign.Right, width: 40 },
                    { field: "billTypeName", headerText: 'Bill Type', textAlign: ej.TextAlign.Left, width: 55 },
                ]
            });

        },

        
        getAcademicYears() {

            axios.get('/schsetups/GetAcaYrs').then(response => {

                this.academicYearList = response.data;


            }).catch(err => {

                this.toastHandler('error', 'Unable to get academic years.');

            });
        },

        getAcademicYearDetails(id) {

            return this.academicYearList.find(a => a.id === id);
        },
        getSchClasses() {

            axios.get('/schsetups/GetClasses').then(response => {

                this.schClasses = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get classes.');

            });
        },

        getBillTypes() {

            axios.get('/schsetups/GetBillTypes').then(response => {

                this.billTypeList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get bill types.');

            });
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
        }
    },
    watch: {

        selectedAcademicYearId(val) {

            if (val) {

                let academicYear = this.getAcademicYearDetails(val);
                this.termList = academicYear.terms;
            }

        },

    },
    created() {

        this.getAcademicYears();
        this.getSchClasses();
        this.getBillTypes();
    },
});