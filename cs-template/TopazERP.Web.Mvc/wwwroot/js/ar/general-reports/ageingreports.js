const app = Vue.createApp({
    data() {
        return {
        emptyGuid: '00000000-0000-0000-0000-000000000000',
        isLoading: false,
        payload: {},
        reportType: 'byDateSummary',
        startDate : moment().format("YYYY-MM-DD"),
        agingInterval: 30,
        reportApiBaseUrl: '',
        customerGroupId: '',
        customerGroupList: [],
        customerGroupName: '',
        customerList: [],
        customerId: '',
        reportPath: '',
        reportPathConfig: {
            summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1744299058/erp-reports/ar/ARAging_tzoc8x.rdl',
            summaryReportByDatePath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1744299280/erp-reports/ar/agingByDate_anucfg_sig94f.rdl',
            summaryReportByCustomerPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1744299280/erp-reports/ar/agingByDate_anucfg_sig94f.rdl',
        },
    }},

    methods: {
        generatePdf() {
            const element = this.$refs.pdfContent; // Get the div content
            html2canvas(element).then((canvas) => {
                const imgData = canvas.toDataURL("image/png");
                const doc = new jsPDF("p", "mm", "a4");

                // Add image to PDF (adjust width & height as needed)
                doc.addImage(imgData, "PNG", 10, 10, 180, 0);

                // Convert the PDF to a Blob URL
                const pdfBlob = doc.output("blob");
                const pdfUrl = URL.createObjectURL(pdfBlob);

                // Open the PDF in a new tab
                window.open(pdfUrl, "_blank");
            });
        },
        getReportData() {
            this.isLoading = true;
            let url = `/ArReports/GetAgingSummary?startDate=${this.startDate}&agingInterval=${this.agingInterval}`;
            this.reportPath = this.reportPathConfig.summaryReportPath;
            switch (this.reportType) {
                case 'byDateSummary':
                    this.reportPath = this.reportPathConfig.summaryReportByDatePath;
                    url = `/ArReports/GetAgeingByDate?startDate=${this.startDate}&agingInterval=${this.agingInterval}`;
                    break;
                case 'byCustomer':
                    this.reportPath = this.reportPathConfig.summaryReportByDatePath;
                    url = `/ArReports/GetAgeingByCustomer?CustomerId=${this.customerId}&startDate=${this.startDate}&agingInterval=${this.agingInterval}`;
                    break;
            }
            axios.get(url).then(response => {

                this.renderReport(response.data.reportHeader, response.data.reportDetails.invoices, this.reportPath);
                this.isLoading = false;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get data');
                this.isLoading = false;

            });
        },


        renderReport(header, details, reportPath) {

            $("#reportView").empty();

            $("#reportView").boldReportViewer({

                reportServiceUrl: this.reportApiBaseUrl,
                processingMode: ej.ReportViewer.ProcessingMode.Local,
                toolbarSettings: {
                    showToolbar: true,
                    items: ej.ReportViewer.ToolbarItems.All &
                        ~ej.ReportViewer.ToolbarItems.Print
                },
                reportPath: reportPath,
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
        getCustomers() {
            axios.get('/SharedResource/GetCustomers')
                .then(response => {
                    this.customerList = response.data;
                    if (this.customerList.length > 0) {
                        this.customerId = this.customerList[0].id;
                    } else {
                        this.customerId = null;
                    }
                    this.customerList.forEach((customer) => {
                        customer.displayText = customer.name + ' - ' + customer.accountNumber;
                    });
                    $("#customerId").ejDropDownList({
                        dataSource: this.customerList,
                        watermarkText: "Select Customer",
                        width: "100%",
                        fields: { id: "id", text: "displayText", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.customerId = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get customers.');
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

        this.getReportData();
        this.getCustomers();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.mount('#app');