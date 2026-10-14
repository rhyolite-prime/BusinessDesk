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
            assessmentType: 'Interest',
            academicYears: [],
            classes: [],
            academicYearName: '',
            termName: '',
            className: '',
            mainClasses: [],
            streams: [],
            terms: [],
            isPreviewLoading: false,
        }
    },
    computed: {
        hasErrors() {
            return this.previewRows.some(r => r.error);
        },
    },
    mounted() {
        this.loadDropdowns();
    },
    methods: {
        downloadTemplate() {
            const params = new URLSearchParams({
                academicYearId: this.academicYearId,
                termId: this.termId,
                classId: this.classId,
                assessmentType: this.assessmentType,
            }).toString();

            if (!this.academicYearId || !this.termId || !this.classId){
                this.toastHandler('warning', 'Please select Academic Year, Term, and Class.');
                return;
            }

            window.open(`/SmImportData/UploadBehavioralSheet?${params}`, '_blank');
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
            formData.append("assessmentType", this.assessmentType);
            this.isPreviewLoading = true;

            axios.post("/SmImportData/PreviewBehavioralAssessments", formData)
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

            const assessments = validRows.map(x => ({
                id : x.id,
                studentId: x.studentId,
                studentIdentifier: x.studentIdentifier,
                studentName: x.studentName,
                description: x.description
            }));

            axios.post('/SmImportData/ImportAssessment', {
                academicYearId: this.academicYearId,
                academicYearName: this.academicYearName,
                termId: this.termId,
                termName: this.termName,
                classId: this.classId,
                className: this.className,
                assessmentType: this.assessmentType,
                assessments: assessments
            })
                .then(res => {
                    const result = res.data?.result;

                    if (!result) {
                        toastr.error("Invalid server response");
                        return;
                    }

                    toastr[result.code === 200 ? 'success' : 'error'](result.message);
                    this.previewRows = [];
                })
                .catch(err => {
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