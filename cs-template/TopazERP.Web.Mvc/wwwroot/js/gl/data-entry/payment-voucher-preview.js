let vue = new Vue({
    el: '#app',
    data: {

        isLoading: false,
        voucherId: '',
        reportApiBaseUrl: '',
    },

    methods: {

        getVoucherData() {

            axios.get(`/LedgerDataEntry/GenerateVoucherPreview?id=${this.voucherId}`).then(response => {

                response.data.reportDetails.pvDetails.forEach(detail => {
                    
                    detail.hasWithHolding = detail.withHold ? 'Yes' : 'No';
                    detail.creditAccountName = response.data.reportDetails.pvHeader.bankAccountName;
                })
                
                this.renderReport(response.data.reportHeader, response.data.reportDetails.pvHeader, response.data.reportDetails.pvDetails);

            }).catch(err => {

                this.toastHandler('error', 'Unable to retrieve voucher data.');
            });
        },

        renderReport(header, pvHeader, pvDetails) {

            $("#reportView").boldReportViewer({

                reportServiceUrl: this.reportApiBaseUrl,
                processingMode: ej.ReportViewer.ProcessingMode.Local,
                reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1782837158/erp-reports/gl/supplier-payment-voucher-preview_yckilu.rdl',
                dataSources: [{
                    value: header,
                    name: "DataSet1"
                },
                {
                    value: [pvHeader],
                    name: "DataSet2"
                },
                {
                    value: pvDetails,
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