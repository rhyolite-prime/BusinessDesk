let vue = new Vue({
    el: '#app',
    data: {
        isLoading: false,
        voucherId: '',
        reportApiBaseUrl: '',
    },

    methods: {

        getVoucherData() {

            axios.get(`/LedgerDataEntry/GenerateReceiptVoucherPreview?id=${this.voucherId}`).then(response => {
 
                this.renderReport(response.data.reportHeader, response.data.reportDetails);

            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve voucher data.');
            });
        },

        renderReport(header, details) {

            $("#reportView").boldReportViewer({

                reportServiceUrl: this.reportApiBaseUrl,
                processingMode: ej.ReportViewer.ProcessingMode.Local,
                reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1784044796/erp-reports/gl/receipt-payment-voucher-preview_dzpkst.rdl',
                dataSources: [{
                    value: header,
                    name: "DataSet1"
                },
                {
                    value: details,
                    name: "DataSet2"
                },
                {
                    value: details,
                    name: "DataSet3"
                }]

            });

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

        this.voucherId = voucherId;
        this.getVoucherData();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
});