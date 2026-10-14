const app = Vue.createApp({
    data() {
        return {
            file: null,
            previewRows: [],
            loading: false,
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            schClasses: [],
            academicYearId: '',
            termId: '',
            classId: '',
            uploadFile: null,
            type: 'OpeningBalance',
            academicYears: [],
            classes: [],
            mainClasses: [],
            streams: [],
            isPreviewLoading: false,
            previewPage: 1,
            previewPerPage: 10,
        }
    },
    computed: {
        hasErrors() {
            return this.previewRows.some(r => r.error);
        },
        paginatedPreviewRows() {
            const start = (this.previewPage - 1) * this.previewPerPage;
            return this.previewRows.slice(start, start + this.previewPerPage);
        },

        totalPreviewPages() {
            return Math.ceil(this.previewRows.length / this.previewPerPage) || 1;
        },
    },
    mounted() {
        this.loadDropdowns();
    },
    methods: {
        formatMoney(value) {
            return Number(value || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },
        formatDate(date) {
            if (!date) return '-';
            const d = new Date(date);
            if (isNaN(d.getTime())) return '-';
            return d.toLocaleDateString();
        },
        downloadTemplate() {
            const params = new URLSearchParams({
                academicYearId: this.academicYearId,
                classId: this.classId,
            }).toString();
            if (!this.academicYearId || !this.classId){
                this.toastHandler('warning', 'Please select Academic Year and Class');
                return;
            }

            window.open(`/SmImportData/UploadSample?${params}`);
        },
        onFileUpload(e) {
            const selectedFile = e.target.files[0];

            if (!selectedFile) return;

            this.file = selectedFile;
            this.previewRows = [];

            this.previewFile();
        },


        previewFile() {
            if (!this.file || !this.classId) return;

            let formData = new FormData();
            formData.append("customFile", this.file);
            formData.append("classId", this.classId);
            this.isPreviewLoading = true;

            axios.post("/SmImportData/PreviewOpeningBalances", formData)
                .then(res => {
                    this.previewRows = res.data.result || [];
                }).catch(err => {
                toastr.error(err.response?.data?.message || "Preview failed");
                this.previewRows = [];
            })
                .finally(() => {
                    this.isPreviewLoading = false;
                });
        },


        importBalances() {
            if (!this.academicYearId || !this.classId) {
                this.toastHandler('warning', 'Please select Academic Year and Class');
                return;
            }

            if (this.previewRows.length === 0) {
                this.toastHandler('warning', 'No records to import');
                return;
            }
            var studentId = this.previewRows.map(r => r.studentId);

            axios.post("/SmImportData/ImportOpeningBalances", {
                studentId: studentId, 
                academicYearId: this.academicYearId,
                classId: this.classId,
                records: this.previewRows
            }).then(() => {
                toastr.success("Opening balances imported successfully");
                this.previewRows = [];
            });
        },

        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
            ]).then(axios.spread((
                years, classes, mainClasses, streams
            ) => {
                this.academicYears = years.data;
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.initDropdowns();
            }));
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        /* ===========================
           INIT EJ DROPDOWNS
        ============================ */
        initDropdowns() {
            const activeYear = this.academicYears.find(y => y.isActive === true);
            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },

                change: args => {
                    this.academicYearId = args.value;
                },
                value: activeYear ? activeYear.id : null
            });
            if (activeYear) {
                this.academicYearId = activeYear.id;
            }
            const levelClassDropdown = this.classes.map(c => ({
                id: c.id, // levelClassId
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            $('#classId').ejDropDownList({
                dataSource: levelClassDropdown,
                width: "100%",
                watermarkText: "Select Source Class...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.classId = args.value;
                  
                }
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
});
app.mount('#app');