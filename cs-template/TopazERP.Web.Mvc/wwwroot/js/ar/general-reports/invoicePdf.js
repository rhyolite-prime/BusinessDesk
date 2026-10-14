const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            isLoading: false,
            payload: {},
            reportApiBaseUrl: '',
            PrintedDate: moment().format("YYYY-MM-DD"),
            invoiceList: [],
            invoiceNumber: '',
            invoiceId: '',
            pdfUrl: '',
        }
    },

    methods: {
        getPdf() {
            this.isLoading = true;
            let url = `/ArReports/GetInvoiceInPdf?id=${this.invoiceId}`;

            axios.get(url, { responseType: 'blob' })
                .then(response => {
                    if (!response.data) {
                        this.toastHandler("warning", "No Data is selected for printing.");
                        return;
                    }

                    const blob = new Blob([response.data], { type: "application/pdf" });
                    const blobUrl = URL.createObjectURL(blob);

                    // Render inside iframe by setting pdfUrl
                    this.pdfUrl = blobUrl;

                    this.isLoading = false;
                })
                .catch(err => {
                    this.toastHandler("error", "Unable to load the invoice. Please try again.");
                    this.isLoading = false;
                });
        },
        getInvoices() {
            axios.get('/ArDataEntry/GetInvoices')
                .then(response => {
                    this.invoiceList = response.data.filter(x => x.isCanceled === false);
                    if (this.invoiceList.length > 0) {
                        this.invoiceId = this.invoiceList[0].id;
                        this.invoiceList.forEach((item) => {
                                item.displayText = item.invoiceNumber + ' - ' + item.customerName;
                            }
                        );
                    } else {
                        this.invoiceId = null;
                    }
                    $("#invoiceId").ejDropDownList({
                        dataSource: this.invoiceList,
                        watermarkText: "Select Invoice Number",
                        width: "100%",
                        fields: { id: "id", text: "displayText", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.invoiceId = args.value;
                        }
                    });
                })

                .catch(err => {
                    this.toastHandler('error', 'Unable to get invoices.');
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




    mounted() {
        this.getInvoices();
    },
});
app.mount('#app');