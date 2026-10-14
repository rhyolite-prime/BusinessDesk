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
            teacherType: 'Class',
            remarkType: 'MidTerm',
            academicYears: [],
            classes: [],
            terms: [],
            mainClasses: [],
            streams: [],
            isPreviewLoading: false,
        }
    },
    computed: {
        hasErrors() {
            return this.previewRows.some(r => r.error);
        }
    },
    mounted() {
        this.loadDropdowns();
    },
    methods: {
        downloadTemplate() {
            const params = new URLSearchParams({
                academicYearId: this.academicYearId,
                classId: this.classId,
                teacherType: this.teacherType,
                remarkType: this.remarkType,
                termId: this.termId
            }).toString();
            if (!this.academicYearId || !this.classId || !this.termId){
                this.toastHandler('warning', 'Please select Academic Year, Term and Class');
                return;
            }

            window.open(`/SmImportData/UploadRemarkSheet?${params}`);
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
            formData.append("academicYearId", this.academicYearId);
            formData.append("termId", this.termId);
            formData.append("classId", this.classId);
            formData.append("teacherType", this.teacherType);
            formData.append("remarkType", this.remarkType);
            this.isPreviewLoading = true;

            axios.post("/SmImportData/PreviewRemark/", formData)
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
            if (!this.academicYearId || !this.classId || !this.termId) {
                this.toastHandler('warning', 'Please select Academic Year, Term and Class');
                return;
            }

            if (this.previewRows.length === 0) {
                this.toastHandler('warning', 'No records to import');
                return;
            }
            var studentId = this.previewRows.map(r => r.studentId);

            axios.post("/SmImportData/ImportRemarks", {
                studentId: studentId,
                academicYearId: this.academicYearId,
                termId: this.termId,
                classId: this.classId,
                teacherType: this.teacherType,
                remarkType: this.remarkType,
                students: this.previewRows
            }).then(() => {
                toastr.success("data imported successfully");
                this.previewRows = [];
            });
        },

        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
            ]).then(axios.spread((
                years, classes, mainClasses, streams, terms
            ) => {
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
            $('#termId').ejDropDownList({
                dataSource: this.terms,
                width: "100%",
                watermarkText: "Select Term...",
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