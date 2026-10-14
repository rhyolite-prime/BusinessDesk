
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        nationalityList: [],
        selectedNationalityId: '',

    },

    methods: {

        getData() {

            if (this.selectedNationalityId) {

                axios.get('/SchEnquiries/GetStudentsByNationality?nationalityId=' + this.selectedNationalityId).then(response => {

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
                    { field: "className", headerText: "Nationality", width: 55, },
                    { field: "studentStatusName", headerText: "Status", width: 45, },

                ]
            });

        },

        
        getNationalities() {

            axios.get('/SharedResource/GetCountries').then(response => {

                this.nationalityList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get nationalities.');

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

        this.getNationalities();
    },
});