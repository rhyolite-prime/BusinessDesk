
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        academicYearList: [],
        schClasses: [],
        studentList: [],
        selectedAcademicYearId: '',
        selectedTermId: '',
        selectedClassId: '',
        schClasses: [],
    },

    methods: {

        getData() {

            if (this.selectedClassId) {

                axios.get('/SchEnquiries/GetStudentsByClass?classId=' + this.selectedClassId).then(response => {

                    response.data.forEach((v) => {

                        if (v.middleName) {

                            v.studentName = v.firstName + ' ' + v.lastName + ' ' + v.middleName;

                        }
                        else {

                            v.studentName = v.firstName + ' ' + v.lastName;

                        }
                    });

                    this.renderTable(response.data);

                }).catch(err => {

                    this.toastHandler('error', 'Unable to get data.');

                });


            }

           
        },

        renderTable(responseData) {

            $("#dataTable").ejGrid({
                dataSource: responseData,
                allowPaging: true,
                isResponsive: true,
                columns: [

                    { field: "id", visible: false, width: 10, isPrimaryKey: true, },
                    { field: "studentIdentifier", headerText: "Student ID", width: 50, },
                    { field: "studentName", headerText: "Student  Name", width: 95, },
                    { field: "gender", headerText: "Gender", width: 45, },
                    { field: "academicYearName", headerText: "Aca. Year Enrolled", width: 55, },
                    { field: "religionName", headerText: "Religion", width: 45, },
                    { field: "nationalityName", headerText: "Nationality", width: 55, },
                    { field: "studentStatusName", headerText: "Status", width: 45, },

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