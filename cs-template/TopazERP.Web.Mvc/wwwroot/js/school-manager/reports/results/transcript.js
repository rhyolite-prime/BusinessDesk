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

            termBeginDate: new Date().toLocaleDateString(),
            reportPath: 'https://res.cloudinary.com/dusydqiob/raw/upload/v1771511531/erp-reports/school-manager/transcript_qeobji.rdl',
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
            return this.allLevels.find(c => c.actualLevelId === levelId)?.actualLevelName || '';
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
            $('#studentId').ejDropDownList({
                dataSource: this.students,
                width: "100%",
                watermarkText: "Select Student...",
                enableFilterSearch: true,
                fields: { id: "id", text: "name", value: "id" },
                change: args => {
                    this.studentId = args.value;
                    this.searchReport();
                }
            });
        },
        formatStudentName(student) {
            return [student.lastName, student.firstName, student.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');
        },
        getSubjectRemark(totalScore, stage) {
            return this.remarks.find(r =>
                r.stage === stage &&
                totalScore >= r.minMark &&
                totalScore <= r.maxMark
            ) || null;

        },
        getStageSubjectRemarks(stage) {
            const stageRemarks = this.remarks.filter(r => r.stage === stage);
            stageRemarks.forEach(r => {
                r.name = `${r.minMark} - ${r.maxMark} - ${r.gradeNumber} - ${r.remark}`
            })
            return stageRemarks;
        },


        getClassTeacherRemark(studentId, classId) {
            const source = this.classTeacherRemarks.filter(r => r.remarkType === 'Overall' && r.teacherType === 'Class');
            const record = source.find(b =>
                String(b.classId) === String(classId) &&
                String(b.studentId) === String(studentId) &&
                String(b.academicYearId) === String(this.academicYearId)
            )

            return record ? record.remark : '';

        },
        getHeadTeacherRemark(studentId, classId) {
            const source = this.classTeacherRemarks.filter(r => r.remarkType === 'Overall' && r.teacherType === 'Head');
            const record = source.find(b =>
                String(b.classId) === String(classId) &&
                String(b.studentId) === String(studentId) &&
                String(b.academicYearId) === String(this.academicYearId)
            )

            return record ? record.remark : '';
        },


        searchReport() {
            if (!this.studentId) {
                this.toastHandler('warning', 'Please select Student to generate report.');
                return;
            }

            const studentRecord = this.students.find(s => String(s.id) === String(this.studentId));
            if (!studentRecord) {
                this.toastHandler('warning', 'Selected student not found.');
                return;
            }

            const studentName = [studentRecord.lastName, studentRecord.firstName, studentRecord.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');

            const studentIdentifier = studentRecord.studentIdentifier;

            // 1) Filter ALL assignments that contain this student (transcript)
            const filteredData = (this.allAssignments || []).filter(a =>
                Array.isArray(a.details) &&
                a.details.some(d => String(d.studentIdentifier) === String(studentIdentifier))
            );

            if (!filteredData.length) {
                this.toastHandler('warning', 'No results found for this student.');
                return;
            }

            // Helper to safely get student's marks from an assessment
            const getStudentMarks = (assessment) => {
                const detail = (assessment.details || []).find(d =>
                    String(d.studentIdentifier) === String(studentIdentifier)
                );
                return Number(detail?.marks) || 0;
            };

            /* ===============================
               GROUP BY (AcademicYear, Term, Class, Subject)
               so we can compute totals per subject per term/year/class
            =============================== */
            const bucket = new Map(); // key => aggregated marks

            filteredData.forEach(a => {
                const yearId = a.academicYearId;
                const termId = a.termId;
                const classId = a.classId;
                const subjectId = a.subjectId;

                if (!yearId || !termId || !subjectId) return;

                const key = `${yearId}|${termId}|${classId || ''}|${subjectId}`;

                if (!bucket.has(key)) {
                    bucket.set(key, {
                        academicYearId: yearId,
                        termId: termId,
                        classId: classId,
                        subjectId: subjectId,

                        classScoreObtained: 0,
                        classScoreOverall: 0,
                        examScoreObtained: 0,
                        examScoreOverall: 0
                    });
                }

                const agg = bucket.get(key);
                const marks = getStudentMarks(a);

                if (a.type === 'Exam') {
                    agg.examScoreObtained += marks;
                    agg.examScoreOverall += Number(a.overallMark) || 0;
                } else if (a.type !== 'MidTerm') {
                    // exclude MidTerm
                    agg.classScoreObtained += marks;
                    agg.classScoreOverall += Number(a.overallMark) || 0;
                }
            });

            /* ===============================
     BUILD FINAL REPORT ROWS
     SHOW ALL SUBJECTS EVEN IF NO DATA
  =============================== */
            const reportRows = [];
            const stageRemarks = [];
            const usedStages = new Set();

// 1) Build unique class/year/term combos from the student's data
            const combos = [...new Set(
                [...bucket.values()].map(b => `${b.academicYearId}|${b.termId}|${b.classId || ''}`)
            )].map(key => {
                const [academicYearId, termId, classId] = key.split('|');
                return { academicYearId, termId, classId };
            });

// helper: get subjectIds for a specific class+year+term from your subjects setup
            const getSubjectIdsForCombo = (classId, academicYearId, termId) => {
                const classSubjects = (this.subjects || []).filter(s =>
                    String(s.classId) === String(classId) &&
                    String(s.academicYearId) === String(academicYearId) &&
                    String(s.termId) === String(termId)
                );

                return [
                    ...new Set(
                        classSubjects.flatMap(cs => (cs.details || []).map(d => d.subjectId)).filter(Boolean)
                    )
                ];
            };

            combos.forEach(({ academicYearId, termId, classId }) => {
                const classInfo = this.classes.find(c => String(c.id) === String(classId)) || {};
                const levelId = classInfo.levelId;
                const levelInfo = this.allLevels.find(l => String(l.id) === String(levelId)) || {};
                const actualLevelId = levelInfo.actualLevelId;
                const levelName = this.getLevelName(actualLevelId);
                const normalized = (levelName || '').toString().toLowerCase();

                const stage = normalized.includes('jhs') || normalized.includes('junior high')
                    ? 'JHS'
                    : 'Primary';
                usedStages.add(stage);

                const className = classInfo.id
                    ? `${this.getMainClassName(classInfo.classId)} ${this.getStreamName(classInfo.streamId)}`.trim()
                    : '';

                const academicYearName =
                    this.academicYears.find(y => String(y.id) === String(academicYearId))?.name || '';

                const term = this.terms.find(t => String(t.id) === String(termId)) || {};
                const termName = term.name || '';

                const yearTerm = this.academicYearTerm?.find(y =>
                    String(y.academicYearId) === String(academicYearId) &&
                    String(y.termId) === String(termId)
                );
                const endTermDate = yearTerm ? this.normalizeDate(yearTerm.endDate) : '';

                const classTeacher = this.teacherClasses?.find(x => String(x.classId) === String(classId))?.mainTeacherId;
                const teacherName = this.teachers?.find(t => String(t.id) === String(classTeacher))?.fullName || '';

                // percentages per academic year + level
                const yearPercentages = this.classLevelPercentages?.find(y => String(y.academicYearId) === String(academicYearId));
                let classPercentage = 0, examPercentage = 0;
                if (yearPercentages?.details && levelId) {
                    const levelMatch = yearPercentages.details.find(d => String(d.levelId) === String(levelId));
                    if (levelMatch) {
                        classPercentage = Number(levelMatch.classPercentage) || 0;
                        examPercentage = Number(levelMatch.examPercentage) || 0;
                    }
                }

                // 2) Get ALL subjects expected for this class/year/term
                const subjectIds = getSubjectIdsForCombo(classId, academicYearId, termId);

                // If you want: when setup has no subjects, still show nothing (or you can fallback to bucket subjects)
                // Fallback:
                const fallbackBucketSubjectIds = [...new Set(
                    [...bucket.values()]
                        .filter(b => String(b.academicYearId) === String(academicYearId) &&
                            String(b.termId) === String(termId) &&
                            String(b.classId || '') === String(classId || ''))
                        .map(b => b.subjectId)
                )];

                const finalSubjectIds = subjectIds.length ? subjectIds : fallbackBucketSubjectIds;

                finalSubjectIds.forEach(subjectId => {
                    const key = `${academicYearId}|${termId}|${classId || ''}|${subjectId}`;
                    const b = bucket.get(key) || {
                        classScoreObtained: 0,
                        classScoreOverall: 0,
                        examScoreObtained: 0,
                        examScoreOverall: 0
                    };

                    const classPercent100 = b.classScoreOverall > 0 ? (b.classScoreObtained / b.classScoreOverall) * 100 : 0;
                    const examPercent100  = b.examScoreOverall > 0 ? (b.examScoreObtained / b.examScoreOverall) * 100 : 0;

                    const percentageClassScore = (classPercent100 / 100) * classPercentage;
                    const percentageExam = (examPercent100 / 100) * examPercentage;

                    const totalScore = percentageClassScore + percentageExam;
                    const remarkObj = this.getSubjectRemark(totalScore, stage);

                    const subjectTeacherId = this.subjectTeachers?.find(t => String(t.subjectId) === String(subjectId))?.staffId;
                    const subjectTeacherName = this.teachers?.find(t => String(t.id) === String(subjectTeacherId))?.fullName || '';

                    reportRows.push({
                        StudentIdentifier: studentIdentifier,
                        HouseName: studentRecord.houseName,
                        SubjectId: subjectId,
                        StudentName: studentName,
                        SubjectName: this.getSubjectName(subjectId),
                        SubjectTeacher: subjectTeacherName,

                        ClassScoreObtained: b.classScoreObtained,
                        ClassScoreOverall: b.classScoreOverall,
                        PercentageClassScore: percentageClassScore,

                        ExamScoreObtained: b.examScoreObtained,
                        ExamScoreOverall: b.examScoreOverall,
                        PercentageExam: percentageExam,

                        AddmissionDate: this.normalizeDate(studentRecord.admissionDate),

                        TotalScore: totalScore,
                        ClassName: className,
                        Title: 'Transcript Report',
                        Term: termName,
                        TermEndDate: endTermDate,
                        Year: `${academicYearName} ${termName}`,
                        TeacherName: teacherName,
                        ClassPercentage: classPercentage,
                        ExamPercentage: examPercentage,
                        GradeNumber: remarkObj ? remarkObj.gradeNumber : 'N/A',
                        SubjectRemark: remarkObj ? remarkObj.remark : 'N/A'
                    });
                });
            });

// Stage remarks
            usedStages.forEach(st => {
                stageRemarks.push(...this.getStageSubjectRemarks(st));
            });


            // Sort transcript nicely: Year -> Term -> Subject
            const termOrderMap = { "First Term": 1, "Second Term": 2, "Third Term": 3 };
            reportRows.sort((a, b) => {
                const ya = a.Year || "";
                const yb = b.Year || "";
                const ycmp = ya.localeCompare(yb);
                if (ycmp !== 0) return ycmp;

                const ta = termOrderMap[a.Term] || 99;
                const tb = termOrderMap[b.Term] || 99;
                if (ta !== tb) return ta - tb;

                return (a.SubjectName || "").localeCompare(b.SubjectName || "");
            });

            this.terminalReport = reportRows;
            this.stageRemarks = stageRemarks;

            this.renderReport(this.header, reportRows, stageRemarks, this.reportPath);
        },


        renderReport(header, details, details2, reportPath) {
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
                    {
                        value: details2,
                        name: "DataSet3"
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