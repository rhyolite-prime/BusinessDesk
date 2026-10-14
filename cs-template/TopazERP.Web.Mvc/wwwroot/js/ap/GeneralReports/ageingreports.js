const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            isLoading: false,
            payload: {},
            reportType: 'byDateSummary',
            startDate: moment().format("YYYY-MM-DD"),
            agingInterval: 30,
            reportApiBaseUrl: '',
            supplierGroupId: '',
            supplierGroupList: [],
            supplierGroupName: '',
            supplierList: [],
            supplierId: '',
            reportPath: '',
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1755784323/erp-reports/ap/agingSummary_p4a5eg.rdl',
                summaryReportByDatePath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1755784323/erp-reports/ap/agingByDate_oqqmjy.rdl',
                summaryReportBySupplierPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1755784324/erp-reports/ap/agingBySupplier_swloka.rdl',
            },
        }
    },

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
            let url = `/ApReports/GetAgeingSummary?startDate=${this.startDate}&agingInterval=${this.agingInterval}`;
            this.reportPath = this.reportPathConfig.summaryReportPath;
            switch (this.reportType) {
                case 'byDateSummary':
                    this.reportPath = this.reportPathConfig.summaryReportByDatePath;
                    url = `/ApReports/GetAgeingByDate?startDate=${this.startDate}&agingInterval=${this.agingInterval}`;
                    break;
                case 'bySupplier':
                    this.reportPath = this.reportPathConfig.summaryReportByDatePath;
                    url = `/ApReports/GetAgeingBySupplier?SupplierId=${this.supplierId}&startDate=${this.startDate}&agingInterval=${this.agingInterval}`;
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
        getSuppliers() {
            axios.get('/SharedResource/GetSuppliers')
                .then(response => {
                    this.supplierList = response.data;
                    if (this.supplierList.length > 0) {
                        this.supplierId = this.supplierList[0].id;
                    } else {
                        this.supplierId = null;
                    }
                    this.supplierList.forEach((supplier) => {
                        supplier.displayText = supplier.name + ' - ' + supplier.accountNumber;
                    });
                    $("#supplierId").ejDropDownList({
                        dataSource: this.supplierList,
                        watermarkText: "Select Supplier",
                        width: "100%",
                        fields: { id: "id", text: "displayText", value: "id" },
                        enableFilterSearch: true,
                        change: (args) => {
                            this.supplierId = args.value;
                        }
                    });
                })
                .catch(err => {
                    this.toastHandler('error', 'Unable to get suppliers.');
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
        this.getSuppliers();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.mount('#app');