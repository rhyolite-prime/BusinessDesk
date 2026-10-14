
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
        selectedAcademicYearId: '',
        selectedTermId: '',
        selectedClassId: '',
        schClasses: [],
        billDetails: [],
        studentBills: [],


    },

    methods: {

        getBills() {

            if (this.selectedAcademicYearId && this.selectedTermId && this.selectedClassId) {


                axios.get('/BillsAndPayments/GetOpeningBalances?academicYearId=' + this.selectedAcademicYearId + '&termId=' + this.selectedTermId + '&classId=' + this.selectedClassId).then(response => {


                    this.billDetails = [];

                    if (response.data) {

                        response.data.forEach((header) => {

                            header.headerId = header.id;
                            header.billDate = this.formatShortDate(header.billDate);
                            header.details.forEach((detail) => {
                                detail.headerId = header.id
                                this.billDetails.push(detail);
                            });

                        });
                       

                        this.renderTable(response.data, this.billDetails);

                    }



                }).catch(err => {

                    this.toastHandler('error', 'Unable to get bills');

                });


            }

           
        },

        renderTable(responseData1) {

            $("#dataTable").ejGrid({
                dataSource: responseData1,
                allowPaging: true,
                pageSettings: { pageSize: 10 },
                isResponsive: true,
                allowGrouping: true,
                allowSorting: true,
                enableDropAreaAnimation: true,
                sortSettings: { sortedColumns: [{ field: "studentName", direction: "ascending" }] },
                childGrid: {
                    dataSource: this.billDetails,
                    queryString: "headerId",
                    allowPaging: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    summaryRows: [
                        { title: "Total", summaryColumns: [{ summaryType: ej.Grid.SummaryType.Sum, displayColumn: "feeAmount", dataMember: "feeAmount", format: "{0:n2}" }] },

                    ],
                    columns: [

                        { field: "id", headerText: 'id', isPrimaryKey: true, visible: false, textAlign: ej.TextAlign.Left, width: 10 },
                        { field: "feeName", headerText: 'Fee Description', textAlign: ej.TextAlign.Left, width: 80 },
                        { field: "feeAmount", headerText: 'Fee Amount', format: "{0:n2}", textAlign: ej.TextAlign.Right, width: 50 },
                    ]

                },
                toolbarSettings: { showToolbar: true, toolbarItems: [ej.Grid.ToolBarItems.Search, ej.Grid.ToolBarItems.PrintGrid] },
                editSettings: { allowDeleting: true, showDeleteConfirmDialog: true },
                columns: [

                    { field: "id", headerText: 'Id', isPrimaryKey: true, visible: false, textAlign: ej.TextAlign.Left, width: 10 },
                    { field: "billSetupId", headerText: 'BillSetupId', visible: false, textAlign: ej.TextAlign.Left, width: 10 },
                    { type: "checkbox", width: 15 },
                    { field: "studentIdentifier", headerText: 'Student ID', textAlign: ej.TextAlign.Left, width: 35 },
                    { field: "studentName", headerText: 'Student Name', textAlign: ej.TextAlign.Left, width: 85 },
                    { field: "billNo", headerText: 'Bill No.', textAlign: ej.TextAlign.Left, width: 35 },
                    { field: "billDate", headerText: 'Bill Date', textAlign: ej.TextAlign.Left, width: 45 },
                    { field: "billAmount", headerText: 'Bill Amount', format: "{0:n2}", textAlign: ej.TextAlign.Right, width: 38 },
                    { field: "billBalance", headerText: 'Bill Balance', format: "{0:n2}", textAlign: ej.TextAlign.Right, width: 38 },
                    { field: "description", headerText: 'Description', textAlign: ej.TextAlign.Left, width: 85 },
                ]
            });

        },

        cancelOpeningBalances() {

            this.isLoading = true;
            this.payload = {};

            this.getBillData();

            if (this.studentBills.length) {

                axios.post('/BillsAndPayments/CancelStudentBills', this.studentBills).then(response => {

                    this.isLoading = false;
                    this.toastHandler('', 'Opening Balance(s) cancelled successfully.');
                    this.getBills();

                }).catch(err => {

                    this.toastHandler('error', 'Unable to cancel opening balances.');
                    this.isLoading = false;

                });
            }
            else {

                this.isLoading = false;

                this.toastHandler('warning', 'No bills selected.');

            }

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

        getBillData() {

            var obj = $("#dataTable").ejGrid("instance"), rec = []; this.studentBills = [];
            var check = obj.checkSelectedRowsIndexes;  // collection which holds the page index and the selected record index
            if (check.length) {
                for (var pageInx = 0; pageInx < check.length; pageInx++) {
                    if (!ej.isNullOrUndefined(check[pageInx]))
                        rec = this.getRecords(pageInx, check[pageInx], obj, rec);
                }
            }

            this.studentBills = rec;

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