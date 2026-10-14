
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

                axios.get('/SchEnquiries/GetPromotionHistory?academicYearId=' + this.selectedAcademicYearId).then(response => {


                    if (response.data) {

                        response.data.forEach((v) => {

                            v.datePromoted = this.formatShortDate(v.datePromoted);

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
                    { field: "studentName", headerText: "Student Name", width: 100, },
                    { field: "promotedFromName", headerText: "Promoted From", width: 65, },
                    { field: "promotedToName", headerText: "Promoted To", width: 65, },
                    { field: "datePromoted", headerText: "Date Promoted", width: 50, },

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
   
    created() {

        this.getAcademicYears();
         
    },
});