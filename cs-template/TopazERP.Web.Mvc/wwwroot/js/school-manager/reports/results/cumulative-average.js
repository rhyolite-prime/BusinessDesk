const app = Vue.createApp({
    data() {
        return {
            assignments: [],
            flatAssignments: [],
            isLoading: false,
            schClasses: [],
            academicYearId: '',
            termId: '',
            classId: '',
            uploadFile: null,
            academicYears: [],
            classes: [],
            subjects: [],
            academicYearName: '',
            termName: '',
            className: '',
            subjectId: '',
            subjectName: '',
            assignmentNumber: 1,
            overallMark: 0,
            assignmentDate: '',
            assignmentNo: '',
            classSubjects: [],
            mainClasses: [],
            streams: [],
            mainSubjects: [],
            terms: [],
            students: [],
            tableData: [],
            allAssignments: [],
            reportTitle: '',
            header: [],
            assignmentHeaders: [],
            assignmentOverallMarks: {},
            currentDate: new Date().toLocaleDateString(),
            currentPage: 1,
            totalPages: 0,
            teachers: [],
            teacherSubjects: [],
            teacherClasses: [],
            classLevelPercentages: [],
            remarks: [],
            attendance: [],
            conduct: [],
            attitude: [],
            allLevels: [],
            schoolProfile: [],
            schoolDays: 0,
            classTeacherRemarks: [],
            academicYearTerm: [],
            termDetails: [],
            classPercentage: 0,
            examPercentage: 0,
            classPromotions: [],
            reportType: "1",
            classStudents: [],
            terminalReport: [],
            stageRemarks: [],
            pageNumber: 1,
            pageBreakCount: 1,
            graphReport: [],
            chartData: [],

            termBeginDate: new Date().toLocaleDateString(),
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1772544147/erp-reports/school-manager/cumulative-average_oqvqec.rdl',
        }
    },
    mounted() {
        this.loadDropdowns();
        this.loadAllAssignments();
        this.reportApiBaseUrl = reportApiBaseUrl;
    },
    computed: {
        signatureImage() {
            if (!this.schoolProfile.signature) return '';

            return `data:image/jpeg;base64,${this.schoolProfile.signature}`;
        },
        logoImage() {
            if (!this.schoolProfile.companyLogo) return '';
            return `data:image/jpeg;base64,${this.schoolProfile.companyLogo}`;},
    },
    methods: {
        loadAllAssignments() {
            axios.get('/SmReports/GetAllResults', {}).then(res => {
                this.allAssignments = res.data || [];

            });
        },
        formatDate(dateInput) {

            return moment(dateInput).format("DD-MMM-YYYY");
        },
        loadDropdowns() {
            axios.all([
                axios.get('/SmMainSetups/ListAllAcademicYears'),
                axios.get('/SmMainSetups/ListAllLevelClasses/'),
                axios.get(`/jsonDataSample/terms.json?v=${new Date().getTime()}`),
                axios.get('/SmDataEntry/GetAllAssignedSubjects/'),
                axios.get('/SmMainSetups/ListAllClasses/'),
                axios.get('/SmMainSetups/ListAllStreams/'),
                axios.get('/SmMainSetups/ListAllSubjects/'),
                axios.get('/SmStudentSetups/ListAllStudents/'),
                axios.get('/SmReports/GetReportHeader/'),
                axios.get('/SmStaffSetups/ListAllTeacherSubjects/'),
                axios.get('/SmStaffSetups/ListAllStaffBios/'),
                axios.get('/SmDataEntry/GetAllClassLevelPercentages/'),
                axios.get('/SmDataEntry/GetAllSubjectRemarks/'),
                axios.get('/SmResultsPromotions/GetAllAttendance/'),
                axios.get('/SmResultsPromotions/GetAllBAssessments/'),
                axios.get('/SmMainSetups/ListAllLevels/'),
                axios.get('/SmMainSetups/GetSchoolProfile/'),
                axios.get('/SmResultsPromotions/GetAllRemarks'),
                axios.get('/SmMainSetups/ListAllAcademicYearTerms/'),
                axios.get('/SmMainSetups/ListAllAcademicYearTermDetails/'),
                axios.get('/SmDataEntry/GetAllClassPromotions/'),
                axios.get('/SmDataEntry/GetAllRegisteredClasses/'),

            ]).then(axios.spread((years, classes, terms, subjects, mainClasses, streams, mainSubjects, students, header, teacherSubjects, teachers, percentages, remarks, attendance, assessments, levels, profile, teacherRemarks,
                                  yearTerms, termDetails, classPromotions, teacherClasses) => {

                this.academicYears = years.data;
                this.classes = classes.data;
                this.mainClasses = mainClasses.data;
                this.streams = streams.data;
                this.header = header.data;
                this.terms = terms.data;
                this.mainSubjects = mainSubjects.data;
                this.teachers = teachers.data;
                this.teachers.forEach(t => {
                    t.fullName = `${t.firstName} ${t.lastName}`
                });
                this.subjects = subjects.data;
                this.students = students.data.filter(s => !s.isAlumni);
                this.students.forEach(s => {
                    s.name = this.formatStudentName(s);
                });
                this.students.sort((a, b) => a.lastName.localeCompare(b.lastName));
                this.subjectTeachers = teacherSubjects.data;
                this.classLevelPercentages = percentages.data;
                this.remarks = remarks.data;
                this.attendance = attendance.data;
                this.conduct = assessments.data.filter(a => a.assessmentType === 'Conduct');
                this.attitude = assessments.data.filter(a => a.assessmentType === 'Attitude');
                this.allLevels = levels.data;
                this.schoolProfile = profile.data;
                this.classTeacherRemarks = teacherRemarks.data;
                this.academicYearTerm = yearTerms.data;
                this.termDetails = termDetails.data;
                this.classPromotions = classPromotions.data;
                this.teacherClasses = teacherClasses.data;
                this.initDropdowns();
            }));
        },

        getTeachersByClass(classId) {
            const regClass = this.teacherClasses
                .find(c => String(c.classId) === String(classId));

            if (!regClass) return [];

            return [
                regClass.mainTeacherId,
                regClass.subTeacherId
            ].filter(Boolean);
        },
        getSubjectName(subjectId) {
            return this.mainSubjects.find(s => s.id === subjectId)?.name || '';
        },
        subjectsBySelection() {
            if (!this.academicYearId || !this.termId || !this.classId) {
                this.classSubjects = [];
                this.refreshSubjectDropdown([]);
                return;
            }
            const match = this.subjects.find(s =>
                s.academicYearId === this.academicYearId &&
                s.termId === this.termId &&
                s.classId === this.classId
            );
            const subjects = match
                ? match.details.map(d => ({
                    id: d.subjectId,
                    name: this.getSubjectName(d.subjectId)
                }))
                : [];
            this.classSubjects = subjects;
            this.refreshSubjectDropdown(subjects);
        },
        refreshSubjectDropdown(data) {
            const ddl = $('#subjectId').data('ejDropDownList');
            if (ddl) {
                ddl.option({
                    dataSource: data,
                    value: null
                });
            }
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
        getClassStudents(classId) {
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
                    this.searchReport();
                }
            });
            return this.classStudents;

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
                    this.searchReport();
                }
            });
          
        },
        formatStudentName(student) {
            return [student.lastName, student.firstName, student.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },

        searchReport() {
            if (!this.classId || !this.academicYearId) {
                this.toastHandler('warning', 'Please select Class,and Academic Year.');
                return;
            }

            /* ===============================
               BASIC METADATA
            =============================== */
            const classInfo = this.classes.find(c => String(c.id) === String(this.classId)) || {};
            const className = `${this.getMainClassName(classInfo.classId)} ${this.getStreamName(classInfo.streamId)}`.trim();

            const academicYearName =
                this.academicYears.find(y => String(y.id) === String(this.academicYearId))?.name || '';

            /* ===============================
               GET CLASS / EXAM PERCENTAGES
            =============================== */
            const levelId = classInfo.levelId;
            const yearPercentages = this.classLevelPercentages.find(y => String(y.academicYearId) === String(this.academicYearId));

            let classPercentage = 0, examPercentage = 0;
            if (yearPercentages && yearPercentages.details) {
                const levelMatch = yearPercentages.details.find(d => String(d.levelId) === String(levelId));
                if (levelMatch) {
                    classPercentage = Number(levelMatch.classPercentage) || 0;
                    examPercentage = Number(levelMatch.examPercentage) || 0;
                }
            }

            this.classPercentage = classPercentage;
            this.examPercentage = examPercentage;

            /* ===============================
               TERMS (FORCE EXACTLY 3)
            =============================== */
            // Terms for year
            const termsForYearRaw = (this.terms || [])
                .filter(t => !t.academicYearId || String(t.academicYearId) === String(this.academicYearId));

            const normalizeTermId = (t) => (t?.id ?? t?.termId ?? t?.TermId ?? null);

            // Detect term number (1/2/3) from the term name
            const getTermNumber = (name) => {
                const s = String(name || '').trim().toLowerCase();
                if (!s) return null;

                // Must contain "term" somewhere, or be very clearly a term label
                const hasTermWord = /\bterm\b/.test(s) || s.includes('term');
                // Examples: "term 1", "term1", "1st term", "first term", "term first", "1 term"
                if (hasTermWord) {
                    if (/\b(1st|first|one)\b/.test(s)) return 1;
                    if (/\b(2nd|second|two)\b/.test(s)) return 2;
                    if (/\b(3rd|third|three)\b/.test(s)) return 3;

                    // numeric forms: "term 1", "term1", "1 term"
                    const m = s.match(/\b([1-3])\b/);
                    if (m) return Number(m[1]);

                    // "term i/ii/iii" (optional)
                    if (/\bterm\s*i\b/.test(s) || /\bterm\s*1\b/.test(s)) return 1;
                    if (/\bterm\s*ii\b/.test(s) || /\bterm\s*2\b/.test(s)) return 2;
                    if (/\bterm\s*iii\b/.test(s) || /\bterm\s*3\b/.test(s)) return 3;
                }

                // If the whole name is just "1" / "2" / "3" (rare but possible)
                if (/^\s*[1-3]\s*$/.test(s)) return Number(s.trim());

                return null;
            };

            // Pick the best matching term for a given number
            const findTermByNumber = (n) => {
                // Prefer terms whose name clearly indicates that number
                return termsForYearRaw.find(t => getTermNumber(t.name) === n) || null;
            };

            const forcedTerms = [1, 2, 3].map(n => {
                const real = findTermByNumber(n);
                if (real) {
                    return {
                        ...real,
                        id: normalizeTermId(real),
                        name: `Term ${n}`,
                        isVirtual: false
                    };
                }
                return { id: null, name: `Term ${n}`, isVirtual: true };
            });
            console.log("Detected terms:", forcedTerms.map(t => ({ name: t.name, id: t.id, isVirtual: t.isVirtual, originalName: t?.name })));
           

            /* ===============================
               SUBJECT IDS
            =============================== */
            const classSubjectsAllTerms = (this.subjects || []).filter(s =>
                String(s.classId) === String(this.classId) &&
                String(s.academicYearId) === String(this.academicYearId)
            );

            const subjectIds = [
                ...new Set(classSubjectsAllTerms.flatMap(cs => (cs.details || []).map(d => d.subjectId)))
            ];

            if (!subjectIds.length) {
                this.toastHandler('warning', 'No subjects found for this class and academic year.');
                return;
            }

            /* ===============================
               ASSIGNMENTS
            =============================== */
            const assignmentsForClassYear = (this.allAssignments || []).filter(a =>
                String(a.classId) === String(this.classId) &&
                String(a.academicYearId) === String(this.academicYearId)
            );

            if (!assignmentsForClassYear.length) {
                this.toastHandler('warning', 'No results found for this class and academic year.');
                return;
            }

            /* ===============================
               STUDENTS
            =============================== */
            const studentsInThisClass = (this.students || []).filter(s =>
                String(s.classId) === String(this.classId)
            );

            if (!studentsInThisClass.length) {
                this.toastHandler('warning', 'No students found in this class.');
                return;
            }

            /* ===============================
               BUILD DATA
            =============================== */
            const chartData = [];

            studentsInThisClass.forEach(studentRecord => {

                const studentName = [
                    studentRecord.lastName,
                    studentRecord.firstName,
                    studentRecord.otherName
                ]
                    .filter(n => n && String(n).trim() !== '')
                    .join(' ');

                const termTotals = {
                    "Term 1": 0,
                    "Term 2": 0,
                    "Term 3": 0
                };

                forcedTerms.forEach(term => {

                    const termAssignments = term.id
                        ? assignmentsForClassYear.filter(a =>
                            String(a.termId || '').trim() === String(term.id || '').trim()
                        )
                        : [];

                    termAssignments.forEach(assessment => {

                        const studentDetail = (assessment.details || []).find(d =>
                            String(d.studentIdentifier || '').trim() ===
                            String(studentRecord.studentIdentifier || '').trim()
                        );

                        if (!studentDetail) return;

                        const type = String(assessment.type || '').toLowerCase();

                        let classScoreObtained = 0;
                        let classScoreOverall = 0;
                        let examScoreObtained = 0;
                        let examScoreOverall = 0;

                        if (type === 'exam') {
                            examScoreObtained += Number(studentDetail.marks) || 0;
                            examScoreOverall += Number(assessment.overallMark) || 0;
                        } else {
                            classScoreObtained += Number(studentDetail.marks) || 0;
                            classScoreOverall += Number(assessment.overallMark) || 0;
                        }

                        const classPercent100 = classScoreOverall > 0
                            ? (classScoreObtained / classScoreOverall) * 100
                            : 0;

                        const examPercent100 = examScoreOverall > 0
                            ? (examScoreObtained / examScoreOverall) * 100
                            : 0;

                        const totalMark =
                            ((classPercent100 / 100) * classPercentage) +
                            ((examPercent100 / 100) * examPercentage);

                        termTotals[term.name] += totalMark;
                    });
                });

                const totalPerStudent =
                    termTotals["Term 1"] +
                    termTotals["Term 2"] +
                    termTotals["Term 3"];

                const studentAverage = totalPerStudent / 3;

                // ✅ Now push ONLY 3 rows (one per term)
                Object.keys(termTotals).forEach(termName => {
                    chartData.push({
                        StudentName: studentName,
                        StudentIdentifier: studentRecord.studentIdentifier,
                        TermName: termName,
                        TotalMark: termTotals[termName].toFixed(2),
                        TotalPerStudent: totalPerStudent.toFixed(2),
                        StudentAverage: studentAverage.toFixed(2),
                        ClassName: className,
                        AcademicYearName: academicYearName
                    });
                });
            });

            /* ===============================
               SORT
            =============================== */
            const termIndex = { "Term 1": 1, "Term 2": 2, "Term 3": 3 };

            chartData.sort((a, b) => {
                const sn = (a.StudentName || '').localeCompare(b.StudentName || '');
                if (sn !== 0) return sn;

                const ta = termIndex[a.TermName] || 99;
                const tb = termIndex[b.TermName] || 99;
                if (ta !== tb) return ta - tb;

                return (a.SubjectName || '').localeCompare(b.SubjectName || '');
            });

            this.chartData = chartData;

            this.graphReport = {
                ClassName: className,
                AcademicYearName: academicYearName,
                TotalStudents: studentsInThisClass.length
            };

            this.renderReport(this.header, this.chartData, this.reportPath);
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
                    },
                ]
            });
        },
        printReport() {
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
                    const blob = new Blob([response.data], {
                        type: 'application/pdf'
                    });
                    const fileURL = URL.createObjectURL(blob);
                    window.open(fileURL);
                })
                .catch(error => {
                    console.error('Error generating report:', error);
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