const app = Vue.createApp({
    data() {
        return {
            file: null,
            previewRows: [],
            loading: false,
            isShimmerLoading: false,
            isLoading: false,
            payload: {},
            uploadFile: null,
            isPreviewLoading: false,
            previewPage: 1,
            previewPerPage: 20
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
        }
    },

    mounted() {
        this.loadDropdowns();
    },
    methods: {
        downloadTemplate() {
            window.open(`/SmImportData/DownloadStudentTemplate`, '_blank');
        },
        onFileUpload(e) {
            const selectedFile = e.target.files[0];

            if (!selectedFile) return;

            this.file = selectedFile;
            this.previewRows = [];

            this.previewFile();
        },
        formatDate(date) {
            if (!date) return '-';
            const d = new Date(date);
            if (isNaN(d.getTime())) return '-';
            return d.toLocaleDateString();
        },
        previewFile() {
            if (!this.file) return;
            this.isPreviewLoading = true;
            let formData = new FormData();
            formData.append("customFile", this.file);

            axios.post("/SmImportData/PreviewStudents/", formData)
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
       
        importData() {
            const validRows = this.previewRows.filter(x => !x.error);

            if (validRows.length === 0) {
                toastr.warning("No valid records to import");
                return;
            }

            axios.post('/SmImportData/ImportStudents/', validRows)
                .then(res => {
                    const result = res.data?.result;

                    if (!result) {
                        toastr.error("Invalid server response");
                        return;
                    }

                    toastr[result.code === 200 ? 'success' : 'error'](result.message);
                    this.previewRows = [];
                }).catch(err => {
                toastr.error(err.response?.data?.message || "Import failed");
                this.previewRows = [];
            });

        },



        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
            ]).then(axios.spread((years, classes, terms, mainClasses, streams) => {

                this.academicYears = years.data;

                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;

                this.terms = terms.data;

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
            this.assignmentDate = new Date().toISOString().substr(0, 10);

            const activeYear = this.academicYears.find(y => y.isActive === true);
            $('#academicYearId').ejDropDownList({
                dataSource: this.academicYears,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },

                change: args => {
                    this.academicYearId = args.value;
                    this.subjectsBySelection();
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

            $('#termId').ejDropDownList({
                dataSource: this.terms,
                width: "100%",
                watermarkText: "Select...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.termId = args.value;
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