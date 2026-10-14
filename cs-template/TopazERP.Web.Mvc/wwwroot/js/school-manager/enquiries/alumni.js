
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        academicYearList: [],
        selectedAcademicYearId: ''
    },

    methods: {

        getData() {

            if (this.selectedAcademicYearId) {


                axios.get('/SchEnquiries/GetAlumniByAcademicYear?academicYearId=' + this.selectedAcademicYearId ).then(response => {


                    if (response.data) {

                        response.data.forEach((v) => {

                            v.completionDate = this.formatShortDate(v.completionDate);

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
                columns: [
                    { field: "id", visible: false, width: 10, isPrimaryKey: true, },
                    { field: "studentIdentifier", headerText: "Student ID", width: 50, },
                    { field: "lastName", headerText: "Last Name", width: 100, },
                    { field: "firstName", headerText: "First Name", width: 50, },
                    { field: "middleName", headerText: "Other Name", width: 70, },
                    { field: "completionDate", headerText: "Completion Date", width: 55, },

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

         

    },
    created() {

        this.getAcademicYears();
         
    },
});