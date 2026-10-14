const app = Vue.createApp({
    data() {
        return {
            academicYears: [],
            classes: [],
            mainClasses: [],
            streams: [],
            terms: [],
            students: [],
            classStudents: [],
            academicYearId: '',
            classId: '',
            termId: '',
            studentId: '',
            pdfUrls: [],
            activeTab: 'view',
            selectedStudents: [],
            selectAll: false,
            isSendingEmails: false,
            emailResultModalVisible: false,
            emailResultMessage: '',
            skippedStudents: [],
            currentPage: 1,
            pageSize: 1,
            isLoadingReports: false,
            isSkipped: false,
            page: 1,
            perPage: 10,
            levelClassDropdown: [],
            isSummary: false
        }
    },
    mounted() {
        this.loadDropdowns();
    },
    computed: {
        paginatedReports() {
            const start = (this.currentPage - 1) * this.pageSize;
            return this.pdfUrls.slice(start, start + this.pageSize);
        },
        totalPages() {
            return Math.ceil(this.pdfUrls.length / this.pageSize);
        },
        paginatedRows() {
            const start = (this.page - 1) * this.perPage;
            return this.classStudents.slice(start, start + this.perPage);
        },

        totalTablePages() {
            return Math.ceil(this.classStudents.length / this.perPage) || 1;
        }
    },
    methods: {
        nextPage() {
            if (this.currentPage < this.totalPages) {
                this.currentPage++;
            }
        },
        prevPage() {
            if (this.currentPage > 1) {
                this.currentPage--;
            }
        },
        selectStudent(student) {
            this.studentId = student.id;
            this.printReport();
        },
        toggleSelectAll() {
            if (this.selectAll) {
                this.selectedStudents = this.classStudents.map(s => s.id);
            } else {
                this.selectedStudents = [];
            }
        },
        emailSelectedStudents() {
            if (!this.selectedStudents.length) {
                this.toastHandler('warning', 'Please select at least one student.');
                return;
            }

            if (!this.academicYearId || !this.termId || !this.classId) {
                this.toastHandler('warning', 'Select Academic Year, Term and Class.');
                return;
            }

            this.isSendingEmails = true; // show loader
            this.emailResultModalVisible = false; // hide modal initially
            let url
            if (this.isSummary) {
                url = '/SmReports/EmailStudentBillSummaryPdf';
            } else {
                url = '/SmReports/EmailStudentBillPdf';
            }

            axios.post(url, {
                studentIds: this.selectedStudents,
                classId: this.classId,
                academicYearId: this.academicYearId,
                termId: this.termId
            })
                .then((res) => {
                    this.emailResultMessage = res.data.message || 'Emails process completed.';
                    this.skippedStudents = res.data.skipped || [];
                    console.log(this.skippedStudents);
                    if (this.skippedStudents !== null) {
                        this.isSkipped = true;
                    }
                    this.emailResultModalVisible = true; // show modal
                    if (res.data.code === 200) {
                        this.selectedStudents = [];
                        this.selectAll = false;
                    }
                })
                .catch(() => {
                    this.emailResultMessage = 'Error sending emails. Please try again.';
                    this.emailResultModalVisible = true; // show modal
                })
                .finally(() => {
                    this.isSendingEmails = false; // hide loader
                });
        },



        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),

            ]).then(axios.spread((years, classes, terms, mainClasses, streams, students) => {

                this.academicYears = years.data;
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;

                this.terms = terms.data;
                this.students = students.data.filter(s => !s.isAlumni);
                this.students.forEach(s => {
                    s.name = this.formatStudentName(s);
                    s.displayText = `${s.studentIdentifier}, ${s.name}`;
                });
                this.students.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.initDropdowns();
            }));
        },
     
        getClassStudents() {
            this.classStudents = this.students.filter(s => s.classId === this.classId);
            this.classStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));

            return this.classStudents;
        },
        getMainClassName(classId) {
            return this.mainClasses.find(c => c.id === classId)?.name || '';
        },
        getStreamName(streamId) {
            return this.streams.find(s => s.id === streamId)?.name || '';
        },
        getLevelName(levelId) {
            return this.allLevels.find(c => c.id === levelId)?.levelName || '';
        },

        initDropdowns() {
            this.assignmentDate = new Date().toISOString().substr(0, 10);
            const activeYear = this.academicYears.find(y => y.isActive === true);
            if (activeYear) {
                this.academicYearId = activeYear.id;
            }
            const levelClassDropdown = this.classes.map(c => ({
                id: c.id, // levelClassId
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
            levelClassDropdown.sort((a, b) => a.name.localeCompare(b.name));
            this.levelClassDropdown = levelClassDropdown;
        },
        formatStudentName(student) {
            return [student.lastName, student.firstName, student.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },

        printReport() {
            if (!this.academicYearId || !this.termId || !this.classId) {
                this.toastHandler('warning', 'Please select all required fields.');
                return;
            }

            this.isLoadingReports = true;
            this.pdfUrls = [];
            this.currentPage = 1;

            const url = this.isSummary ? '/SmReports/DownloadStudentBillSummaryPdf' : '/SmReports/DownloadStudentBillPdf';

            axios.get(url, {
                params: {
                    studentId: this.studentId,
                    academicYearId: this.academicYearId,
                    termId: this.termId
                },
                responseType: 'blob'
            })
                .then(response => {
                    const blob = new Blob([response.data], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    this.pdfUrls.push(url);
                })
                .catch(() => {
                    this.toastHandler('error', 'Error generating report.');
                })
                .finally(() => {
                    this.isLoadingReports = false;
                });
        },
        bulkPrintReports() {

            if (!this.selectedStudents.length) {
                this.toastHandler('warning', 'Please select at least one student.');
                return;
            }

            if (!this.academicYearId || !this.termId || !this.classId) {
                this.toastHandler('warning', 'Please select all required fields.');
                return;
            }

            this.isSendingEmails = true;

            const { PDFDocument } = PDFLib;

            (async () => {

                const selected = this.classStudents.filter(s =>
                    this.selectedStudents.includes(s.id)
                );

                const mergedPdf = await PDFDocument.create();

                for (let student of selected) {

                    const response = await axios.get(this.isSummary ? '/SmReports/DownloadStudentBillSummaryPdf' : '/SmReports/DownloadStudentBillPdf', {
                        params: {
                            studentId: student.id,
                            academicYearId: this.academicYearId,
                            termId: this.termId
                        },
                        responseType: 'arraybuffer'
                    });

                    const pdfBytes = response.data;
                    const pdf = await PDFDocument.load(pdfBytes);

                    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                    copiedPages.forEach(page => mergedPdf.addPage(page));
                }

                const mergedBytes = await mergedPdf.save();

                const blob = new Blob([mergedBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);

                // 👇 OPEN PRINT WINDOW
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed';
                iframe.style.width = '0';
                iframe.style.height = '0';
                iframe.src = url;

                document.body.appendChild(iframe);

                iframe.onload = () => {
                    setTimeout(() => {
                        iframe.contentWindow.focus();
                        iframe.contentWindow.print();
                    }, 500);
                };

                this.isSendingEmails = false;
                this.toastHandler('success', 'Merged report ready for printing.');

            })();
        },
      
        normalizeDate(date) {
            if (!date) return null;
            return new Date(date).toISOString().split('T')[0];
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
        academicYearId(newVal) {
            this.getClassStudents();
        },
        classId(newVal) {
            this.getClassStudents();
        },
    },
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');