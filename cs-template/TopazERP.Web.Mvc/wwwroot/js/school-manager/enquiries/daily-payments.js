
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        academicYearList: [],
        schClasses: [],
        selectedClassId: '',
        paymentDate: moment().format("YYYY-MM-DD"),
    },

    methods: {

        getData() {

            if (this.paymentDate) {

                axios.get('/SchEnquiries/GetDailyPayments?paymentDate=' + this.paymentDate).then(response => {

                    if (response.data) {

                        response.data.forEach((v) => {

                            v.acaTerm = v.academicYearName + '-' + v.termName;
                             
                        });

                        this.renderTable(response.data);

                    }


                }).catch(err => {

                    this.toastHandler('error', 'Unable to get payments');

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
                    { field: "termId", visible: false, width: 10, },
                    { field: "classId", visible: false, width: 10, },
                    { field: "studentIdentifier", headerText: "Student ID", width: 50, },
                    { field: "studentName", headerText: "Student  Name", width: 100, },
                    { field: "className", headerText: "Class", width: 50, },
                    { field: "amountPaid", format: "{0:n2}", textAlign: ej.TextAlign.Right, headerText: "Amount Paid", width: 50, },
                    { field: "acaTerm", headerText: "Academic Year/Term", width: 65, },
                    { field: "modeOfPayment", headerText: "Mode Of Payment", width: 70, },
                    { field: "currencyName", headerText: "Currency", width: 55, },

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
        this.getData();
    },
});