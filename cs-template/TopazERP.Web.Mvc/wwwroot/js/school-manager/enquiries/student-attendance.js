
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        academicYearList: [],
        attendanceDetails: [],
        schClasses: [],
        selectedClassId: '',
        startDate: moment().format("YYYY-MM-DD"),
        endDate: moment().format("YYYY-MM-DD"),
    },

    methods: {

        getData() {

            if (this.selectedClassId && this.startDate && this.endDate) {

                axios.get('/SchEnquiries/GetStudentAttendance?classId=' + this.selectedClassId + '&startDate=' + this.startDate + '&endDate=' + this.endDate).then(response => {

                    this.attendanceDetails = [];

                    if (response.data) {

                        response.data.forEach((header) => {

                            header.headerId = header.id;
                            header.attendanceDate = this.formatShortDate(header.attendanceDate);
                            header.details.forEach((detail) => {
                                detail.headerId = header.id
                                this.attendanceDetails.push(detail);
                            });

                        });

                        this.renderTable(response.data);

                    }



                }).catch(err => {

                    this.toastHandler('error', 'Unable to get data');

                });


            }
           
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                isResponsive: true,
                childGrid: {
                    dataSource: this.attendanceDetails,
                    queryString: "headerId",
                    allowPaging: true,
                    isResponsive: true,
                    pageSettings: { pageSize: 10 },
                    columns: [

                        { field: "id", headerText: 'Id', isPrimaryKey: true, visible: false, textAlign: ej.TextAlign.Left, width: 10 },
                        { field: "studentIdentifier", headerText: 'Student ID', textAlign: ej.TextAlign.Left, width: 45 },
                        { field: "studentName", headerText: 'Student Name', textAlign: ej.TextAlign.Left, width: 95 },

                    ]

                },
                columns: [
                    { field: "id", visible: false, width: 10, isPrimaryKey: true, },
                    { field: "headerId", visible: false, width: 10, },
                    { field: "attendanceDate", format: "{0:dd-MMM-yyyy}", headerText: "Attendance Date", width: 55, },
                    { field: "noPresent", headerText: "No. Present", width: 70, },

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

         

    },
    created() {

        this.getSchClasses();
    },
});