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
        };
    },
    methods: {
        getPdf() {
            this.isLoading = true;
            let url = `/ApReports/GetInvoiceInPdf?id=${encodeURIComponent(this.invoiceId)}`; // Securely encode ID

            axios.get(url, { responseType: 'blob' }) // Set response type to blob
                .then(response => {
                    if (!response.data) {
                        throw new Error("Empty response received.");
                    }

                    // Create a Blob URL for the PDF file
                    const blob = new Blob([response.data], { type: "application/pdf" });
                    const blobUrl = URL.createObjectURL(blob);

                    // Open in new window
                    let printWindow = window.open(blobUrl, "_blank");
                    if (!printWindow) {
                        this.toastHandler("error", "Popup blocked! Please allow popups for this site.");
                    }

                    this.isLoading = false;
                })
                .catch(err => {
                    console.error("Error fetching invoice PDF:", err);
                    this.toastHandler("error", "Unable to load the invoice. Please try again.");
                    this.isLoading = false;
                });
        },
        getInvoices() {
            axios.get('/ApDataEntry/GetInvoices')
                .then(response => {
                    this.invoiceList = response.data.filter(x => x.isCanceled === false);
                    if (this.invoiceList.length > 0) {
                        this.invoiceId = this.invoiceList[0].id;
                        this.invoiceList.forEach((item) => {
                                item.displayText = item.invoiceNumber + ' - ' + item.supplierName;
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