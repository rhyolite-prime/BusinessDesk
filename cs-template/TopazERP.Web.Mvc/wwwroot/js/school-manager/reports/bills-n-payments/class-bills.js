const app = Vue.createApp({
    data() {
        return {
            boardingFeeItems: [],
            standardFeeItems:[],
            supplementaryFeeItems:[],
            supplementaryItemId: '',
            academicYears: [],
            classes: [],
            mainClasses: [],
            streams: [],
            terms: [],
            academicYearId: '',
            termId: '',
            classId: '',
            billTypes:[],
            feeItemId:'',
            isShimmerLoading: false,
            isLoading: false,
            classList: [],
            supplementaryFeeId:'',
            className: '',
            billTypeId: '',
            feeDescriptionId: '',
            feeDescriptions: [],
            reportApiBaseUrl: '',
            reportPathConfig: {
                summaryReportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1783527912/erp-reports/school-manager/classBalance_xjbrdz.rdl',
                summaryReportPath1: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1783528076/erp-reports/school-manager/classBalance1_kenmqf.rdl',
            },
        }
    },
    methods: {
        searchReport() {
            this.isLoading = true;


            if (!this.classId) {
                this.toastHandler('warning', 'Please select a class.');
                this.isLoading = false;
                return;
            }

            let url = `/SmReports/GetClassBills?classId=${this.classId}&academicYearId=${this.academicYearId}&termId=${this.termId}&billTypeId=${this.billTypeId}&feeItemId=${this.feeDescriptionId}`;
            if (this.billTypeId === 2) {
                this.reportPath = this.reportPathConfig.summaryReportPath;
            }
            else {
                this.reportPath = this.reportPathConfig.summaryReportPath1;
            }

            axios.get(url)
                .then(response => {
                    const header  = response.data.reportHeader;
                    const details = response.data.reportDetails.data;
                    this.renderReport(header, details, this.reportPath);
                    this.isLoading = false;
                })
                .catch(err => {
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
                dataSources: [
                    {
                        value: header,
                        name: "DataSet1"
                    },
                    {
                        value: details,
                        name: "DataSet2"
                    }
                ],
                reportError: (args) => {
                    console.error('Bold Report error:', args);
                    this.toastHandler('warning', 'No data available for the selected criteria.');
                }
            });
        },
        getBillTypes(){
            return axios.get(`/jsonDataSample/billTypes.json?v=${new Date().getTime()}`).then(res => {
                this.billTypes = res.data;
            });
        },
        getBoardingItems(){
            return axios.get('/SmMainSetups/GetBoardingItems').then(res => {
                this.boardingFeeItems = res.data;
            });
        },
        getStandardItems(){
            return axios.get('/SmMainSetups/ListAllFeesDescriptions/').then(res => {
                this.standardFeeItems = res.data;
            });
        },
        getSupplementaryItems(){
            return axios.get('/SmMainSetups/ListAllSupplementaryItems/').then(res => {
                this.supplementaryFeeItems = res.data;
            });
        },
        getAcademicYears() {
            return axios.get('/SmMainSetups/ListAllAcademicYears').then(res => {
                this.academicYears = res.data;
                const activeYear = this.academicYears.find(y => y.isActive === true);
                if (activeYear) {
                    this.academicYearId = activeYear.id;
                }
            });
        },

        getTerms() {
            return axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`).then(res => {
                this.terms = res.data;
            });
        },

        getClasses() {
            return axios.get('/SmMainSetups/ListAllLevelClasses/').then(res => {
                this.classes = res.data;
            });
        },

        getMainClasses() {
            return axios.get('/SmMainSetups/ListAllClasses/').then(res => {
                this.mainClasses = res.data;
            });
        },

        getStreams() {
            return axios.get('/SmMainSetups/ListAllStreams/').then(res => {
                this.streams = res.data;
            });
        },

      
        getFeeItemName(feeType, feeItemId) {
            const type = feeType.toLowerCase();
            if (type === 'standard') {
                const item = this.standardFeeItems.find(item => item.id === feeItemId);
                return item ? item.description : 'Unknown';
            }

            if (type === 'supplementary') {
                const item = this.supplementaryFeeItems.find(item => item.id === feeItemId);
                return item ? item.name : 'Unknown';
            }

            if (type === 'boarding') {
                const item = this.boardingFeeItems.find(item => item.id === feeItemId);
                return item ? item.name : 'Unknown';
            }

            return 'Unknown';

        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        getClassName(classId) {
            const cls = this.allLevelClasses.find(c => c.id === classId);
            return cls ? cls.name : '';
        },
        initDropdowns() {
            const levelClassDropdown = this.getLevelClasses();
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            this.classList = levelClassDropdown;
        },
        getLevelClasses() {
                return this.classes.map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                }));
        },
        getAllClasses(classId) {
            return this.classes
                .filter(c => c.id === classId)
                .map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`
                }));
        },
        resetFeeItems() {
            this.feeDescriptionId = '';
            this.feeDescriptions = [];

            switch (Number(this.billTypeId)) {
                case 1: // Academic User Fees
                    this.feeDescriptions = this.standardFeeItems.map(item => ({
                        id: item.id,
                        name: item.description
                    }));
                    break;

                case 2: // Supplementary
                    this.feeDescriptions = this.supplementaryFeeItems.map(item => ({
                        id: item.id,
                        name: item.name
                    }));
                    break;

                case 3: // Boarding
                    this.feeDescriptions = this.boardingFeeItems.map(item => ({
                        id: item.id,
                        name: item.name
                    }));
                    break;

                default:
                    this.feeDescriptions = [];
                    break;
            }
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
    watch: {
        billTypeId(newVal) {
            this.resetFeeItems();
        }
    },
    async mounted() {
      
            await Promise.all([
                this.getAcademicYears(),
                this.getTerms(),
                this.getMainClasses(),
                this.getStreams(),
                this.getClasses(),
                this.getBillTypes(),
                this.getStandardItems(),
                this.getSupplementaryItems(),
                this.getBoardingItems(),
                
            ]);
        this.initDropdowns();
        this.reportApiBaseUrl = reportApiBaseUrl;

    },
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');