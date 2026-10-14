
var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        startDate: moment().subtract(7, "days").format("YYYY-MM-DD"),
        endDate: moment().format("YYYY-MM-DD"),


    },

    methods: {

        getData() {

            if (this.startDate && this.endDate) {

                axios.get('/SchMessaging/GetMessages?startDate=' + this.startDate + '&endDate=' + this.endDate).then(response => {


                    this.renderReport(response.data.header, response.data.details);


                }).catch(err => {

                    this.toastHandler('error', 'Unable to get data.');

                });


            }

        },

        renderReport(header, details) {

            $("#reportView").empty();

            $("#reportView").boldReportViewer({

                reportServiceUrl: this.reportApiBaseUrl,
                processingMode: ej.ReportViewer.ProcessingMode.Local,
                reportPath: 'https://res.cloudinary.com/rhyoliteprime/raw/upload/v1666723393/reportapi/sm/SmsReport.rdl',
                dataSources: [{
                    value: header,
                    name: "DataSet1"
                },
                {
                    value: details,
                    name: "DataSet2"
                }]

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

        this.reportApiBaseUrl = reportApiBaseUrl;
        this.getData();
    },
});