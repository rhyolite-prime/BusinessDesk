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
            perPage: 10
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

            axios.post('/SmReports/EmailTerminalReportPdf', {
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
                });
                this.students.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.initDropdowns();
            }));
        },
       /* getClassStudents(classId) {
            this.classStudents = this.students.filter(s => s.classId === classId);
            this.classStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));
            $('#studentId').ejDropDownList({
                dataSource: this.classStudents,
                width: "100%",
                watermarkText: "Select Student...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.studentId = args.value;
                    this.printReport();
                }
            });
            return this.classStudents;

        },*/
        getClassStudents(classId) {
            this.classStudents = this.students.filter(s => s.classId === classId);
            this.classStudents.sort((a, b) => a.lastName.localeCompare(b.lastName));

            // ➜ ADD THIS
            const studentsWithAll = [
                { id: 'ALL', name: 'All Students' },
                ...this.classStudents
            ];

            $('#studentId').ejDropDownList({
                dataSource: studentsWithAll,
                width: "100%",
                watermarkText: "Select Student...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.studentId = args.value;

                    if (args.value === 'ALL') {
                        this.loadAllStudentReports();
                    } else {
                        this.printReport();
                    }
                }
            });

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
                    this.getClassStudents(args.value);
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
            $('#studentId').ejDropDownList({
                dataSource: this.students,
                width: "100%",
                watermarkText: "Select Student...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.studentId = args.value;
                    if (args.value === 'ALL') {
                        this.loadAllStudentReports();
                    } else {
                        this.printReport();
                    }
                }
            });
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

            axios.get('/SmReports/DownloadTerminalReportPdf', {
                params: {
                    studentId: this.studentId,
                    classId: this.classId,
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
        /*bulkDownloadReports() {

            if (!this.academicYearId || !this.termId || !this.classId) {
                this.toastHandler('warning', 'Please select all required fields.');
                return;
            }
            if (!this.selectedStudents.length) {
                this.toastHandler('warning', 'Please select at least one student.');
                return;
            }
            if (!this.classStudents.length) {
                this.toastHandler('warning', 'No students found.');
                return;
            }

            this.isSendingEmails = true;

            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

            const downloadStudentReport = async (student, index) => {
                try {
                    const response = await axios.get('/SmReports/DownloadTerminalReportPdf', {
                        params: {
                            studentId: student.id,
                            classId: this.classId,
                            academicYearId: this.academicYearId,
                            termId: this.termId
                        },
                        responseType: 'blob'
                    });

                    const blob = new Blob([response.data], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);

                    const link = document.createElement('a');
                    link.href = url;
                    
                    link.download = `${student.name}_TerminalReport.pdf`;

                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);

                    // small delay to prevent browser blocking
                    await delay(300);

                } catch (err) {
                    console.error(`Failed for ${student.name}`, err);
                }
            };

            (async () => {
                const selected = this.classStudents.filter(s =>
                    this.selectedStudents.includes(s.id)
                );

                for (let i = 0; i < selected.length; i++) {
                    await downloadStudentReport(selected[i], i);
                }

                this.isSendingEmails = false;
                this.toastHandler('success', 'Selected reports downloaded.');
            })();
        },*/
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

                    const response = await axios.get('/SmReports/DownloadTerminalReportPdf', {
                        params: {
                            studentId: student.id,
                            classId: this.classId,
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
        loadAllStudentReports() {

            if (!this.academicYearId || !this.termId || !this.classId) {
                this.toastHandler('warning', 'Please select all required fields.');
                return;
            }

            this.isLoadingReports = true;   // ✅ START LOADER
            this.pdfUrls = [];
            this.currentPage = 1;

            const requests = this.classStudents.map(student => {
                return axios.get('/SmReports/DownloadTerminalReportPdf', {
                    params: {
                        studentId: student.id,
                        classId: this.classId,
                        academicYearId: this.academicYearId,
                        termId: this.termId
                    },
                    responseType: 'blob'
                });
            });

            Promise.all(requests)
                .then(responses => {
                    responses.forEach(res => {
                        const blob = new Blob([res.data], { type: 'application/pdf' });
                        const url = URL.createObjectURL(blob);
                        this.pdfUrls.push(url);
                    });
                })
                .catch(() => {
                    this.toastHandler('error', 'Error loading reports.');
                })
                .finally(() => {
                    this.isLoadingReports = false;
                });
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
});
app.mount('#app');