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
            header: {},
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
            pdfUrl: null,
            stageRemarks: [],
            pageNumber: 1,
            pageBreakCount: 1,
            isClassSplitting: false,
            isSubjectSplitting: false,
            type5Loading: false,
            reportData:[],
            stage:'',
            viewerPath:'https://res.cloudinary.com/dusydqiob/raw/upload/v1787316269/erp-reports/school-manager/NewReports/terminal-result-1_ivqprq.json',
            termBeginDate: new Date().toLocaleDateString(),
            reportPath:'https://res.cloudinary.com/dusydqiob/raw/upload/v1786537828/erp-reports/school-manager/terminaltype-1_fsz98x.rdl',
            viewReport: false,
            studentStatus: []
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
        toggleReportType() {

            if (this.reportType === "1")
            {
                this.viewerPath = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1787224823/erp-reports/school-manager/NewReports/terminal-report-1_3_db3skw.json';
                this.reportPath = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1786537828/erp-reports/school-manager/terminaltype-1_fsz98x.rdl';
            }
               
            else if (this.reportType === "2"){
                this.reportPath = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1786537828/erp-reports/school-manager/terminaltype-2_sc7zef.rdl';
                this.viewerPath='https://res.cloudinary.com/dusydqiob/raw/upload/v1787317022/erp-reports/school-manager/NewReports/terminal-result-2_ykmaum.json';
            }
                 else if (this.reportType === "3"){
                this.reportPath = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1786537829/erp-reports/school-manager/terminaltype-3_h7wwe5.rdl';
                if (this.stage === 'JHS') {
                    this.viewerPath = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1788429400/erp-reports/school-manager/NewReports/terminal-3-jhs_guqtes.json';
                }else{
                    this.viewerPath = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1787317021/erp-reports/school-manager/NewReports/termianl-result-3basic_g5ssuo.json';
                }
            }
               

            else if (this.reportType === "4")
                this.reportPath = 'https://res.cloudinary.com/dusydqiob/raw/upload/v1786536960/erp-reports/school-manager/terminaltype4_dgdwmk.rdl';
            
            else if(this.reportType === "5")
            {
                this.reportPath ='';
                this.printReportWithAnalysis();
            }
                
            this.searchReport();
        },

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
                this.header = header.data[0];
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
                this.isClassSplitting = this.schoolProfile.isClassPosition;
                this.isSubjectSplitting = this.schoolProfile.isSubjectPosition;
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
            const stageRemarks = this.remarks
                .filter(r => r.stage === stage)
                .sort((a, b) => Number(a.gradeNumber) - Number(b.gradeNumber));

            return stageRemarks
                .map((r, index) =>
                    `${index + 1}. ${r.minMark} - ${r.maxMark} : ${r.gradeNumber} - ${r.remark}`
                )
                .join(', ');
        },
        getAttendance(studentId) {
            const record = this.attendance.find(a =>
                String(a.academicYearId) === String(this.academicYearId) &&
                String(a.classId) === String(this.classId) &&
                String(a.termId) === String(this.termId) &&
                String(a.studentId) === String(studentId)
            );
            return record ? record.days : 0;
        },
       
        getBehaviouralRemark(type, studentId) {

            const source = type === 'Conduct'
                ? this.conduct
                : this.attitude;

            const record = source.find(b =>
                String(b.classId) === String(this.classId) &&
                String(b.academicYearId) === String(this.academicYearId) &&
                String(b.termId) === String(this.termId) &&
                b.assessmentType === type
            );

            if (!record || !record.assessments) return '';

            const studentAssessment = record.assessments.find(a =>
                a.studentId === studentId
            );

            return studentAssessment ? studentAssessment.description : '';
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
            // ============================================================
            // STEP 1: VALIDATE REQUIRED SELECTIONS
            // ============================================================
            // Ensure all necessary dropdown selections are made before proceeding
            if (!this.classId || !this.academicYearId || !this.termId || !this.studentId) {
                this.toastHandler(
                    'warning',
                    'Please select Class, Academic Year, Term and Student to generate report.'
                );
                return;
            }
            this.isLoading = true;
            // ============================================================
            // STEP 2: EXTRACT BASIC METADATA
            // ============================================================
            // Get class information and derive class hierarchy
            const classInfo = this.classes.find(c => String(c.id) === String(this.classId)) || {};
            const mainClassId = classInfo.classId; // Parent/main class ID (e.g., "JHS 1")
            const className = `${this.getMainClassName(classInfo.classId)} ${this.getStreamName(classInfo.streamId)}`.trim();
            const levelId = classInfo.levelId;

            // Get level information to determine educational stage (JHS or Primary)
            const levelInfo = this.allLevels.find(l => String(l.id) === String(levelId)) || {};
            const actualLevelId = levelInfo.actualLevelId;
            const levelName = this.getLevelName(actualLevelId);
            const stage = levelName?.toUpperCase().includes('JHS') ? 'JHS' : 'Primary';
            this.stage = stage;
            // Get academic year and term details
            const academicYearName = this.academicYears.find(y => String(y.id) === String(this.academicYearId))?.name || '';
            const term = this.terms.find(t => String(t.id) === String(this.termId)) || {};
            const termName = term.name || '';

            // Get the end date for the current term
            const yearTerm = this.academicYearTerm.find(y =>
                String(y.academicYearId) === String(this.academicYearId) &&
                String(y.termId) === String(this.termId)
            );
            const endTermDate = yearTerm ? this.normalizeDate(yearTerm.endDate) : '';

            // Get student information and validate existence
            const student = this.students.find(s => String(s.id) === String(this.studentId));
            const studentRecord = this.students.find(s => String(s.id) === String(this.studentId));
            if (!studentRecord) {
                this.toastHandler('warning', 'Selected student not found.');
                return;
            }

            // Format student name by combining name parts
            const studentName = [studentRecord.lastName, studentRecord.firstName, studentRecord.otherName]
                .filter(n => n && n.trim() !== '')
                .join(' ');

            // Get class teacher information
            const classTeacher = this.teacherClasses.find(s => s.classId === this.classId)?.mainTeacherId;
            const teacherName = this.teachers.find(t => String(t.id) === String(classTeacher))?.fullName || '';

            // Set report title and get basic configuration
            this.reportTitle = 'Terminal Report';
            const schoolDays = this.schoolProfile.schoolDays;

            // Get all subjects for this class, year, and term
            const classSubjects = this.subjects.filter(s =>
                s.classId === this.classId &&
                s.academicYearId === this.academicYearId &&
                s.termId === this.termId
            );

            // Extract unique subject IDs from class subjects
            const subjectIds = [
                ...new Set(
                    classSubjects.flatMap(cs =>
                        (cs.details || []).map(d => d.subjectId)
                    )
                )
            ];

            // ============================================================
            // STEP 3: GET CLASS AND EXAM PERCENTAGE WEIGHTS
            // ============================================================
            // Determine how much class work and exams contribute to final score
            const yearPercentages = this.classLevelPercentages.find(y => y.academicYearId === this.academicYearId);
            let classPercentage = 0, examPercentage = 0;

            if (yearPercentages && yearPercentages.details) {
                const levelMatch = yearPercentages.details.find(d => d.levelId === levelId);
                if (levelMatch) {
                    classPercentage = levelMatch.classPercentage;
                    examPercentage = levelMatch.examPercentage;
                }
            }
            this.classPercentage = classPercentage;
            this.examPercentage = examPercentage;

            // ============================================================
            // STEP 4: GET CLASS PROMOTION INFORMATION
            // ============================================================
            // Determine if this class has promotion rules and get start date
            const classPromotion = this.classPromotions.find(p => p.fromClassId === this.classId);
            let termBeginDate = '';
            let promotedClassName = '';
            if (classPromotion) {
                termBeginDate = this.normalizeDate(classPromotion.startDate);

                if (classPromotion.toClassId) {
                    const toClassInfo = this.classes.find(c => String(c.id) === String(classPromotion.toClassId)) || {};
                    promotedClassName = `${this.getMainClassName(toClassInfo.classId)} ${this.getStreamName(toClassInfo.streamId)}`.trim();
                }
            }

            // ============================================================
            // STEP 5: FILTER ASSIGNMENTS FOR CURRENT SELECTION
            // ============================================================
            // Get all assignments matching the selected class, year, and term
            const filteredData = this.allAssignments.filter(a =>
                String(a.classId) === String(this.classId) &&
                String(a.academicYearId) === String(this.academicYearId) &&
                String(a.termId) === String(this.termId)
            );

            if (!filteredData.length) {
                this.toastHandler('warning', 'No results found for this class, term, and year.');
                return;
            }

            // ============================================================
            // STEP 6: GET STUDENTS IN MAIN CLASS
            // ============================================================
            // Get all students who belong to the main class (for overall ranking)
            const studentsInMainClass = this.students.filter(s => {
                const c = this.classes.find(cl => String(cl.id) === String(s.classId));
                return c && c.classId === mainClassId;
            });

            // ============================================================
            // STEP 7: BUILD STUDENT-SUBJECT SCORE MAP
            // ============================================================
            // Create a map of scores for each subject for the selected student
            const studentSubjectMap = {};

            subjectIds.forEach(subjectId => {
                // Get all assignments for this subject
                const subjectAssignments = filteredData.filter(a =>
                    String(a.subjectId) === String(subjectId)
                );

                let classScoreObtained = 0;
                let classScoreOverall = 0;
                let examScoreObtained = 0;
                let examScoreOverall = 0;

                // Process each assignment and aggregate scores
                subjectAssignments.forEach(assessment => {
                    // Find the selected student's details in this assessment
                    const studentDetail = assessment.details.find(d =>
                        String(d.studentIdentifier) === String(student.studentIdentifier)
                    );

                    if (!studentDetail) return;

                    // Categorize scores by assessment type
                    if (assessment.type === 'Exam') {
                        examScoreObtained += studentDetail.marks || 0;
                        examScoreOverall += assessment.overallMark || 0;
                    }
                    else if (assessment.type !== 'MidTerm') {
                        classScoreObtained += studentDetail.marks || 0;
                        classScoreOverall += assessment.overallMark || 0;
                    }
                });

                // Store the aggregated scores for this subject
                studentSubjectMap[subjectId] = {
                    SubjectId: subjectId,
                    SubjectName: this.getSubjectName(subjectId),
                    classScoreObtained,
                    classScoreOverall,
                    examScoreObtained,
                    examScoreOverall
                };
            });

            // ============================================================
            // STEP 8: HELPER FUNCTION FOR POSITION ASSIGNMENT
            // ============================================================
            /**
             * Assigns positions/ranks to an array of items based on their totalScore.
             * Supports two ranking methods: standard and splitting (skipping positions for ties).
             *
             * @param {Array} arr - Array of objects containing 'totalScore' property
             * @param {boolean} isSplitting - If true, uses competition ranking (1,2,2,4)
             *                               If false, uses dense ranking (1,2,2,3)
             * @returns {Array} - Same array with 'position' property added to each item
             */
            function assignPositions(arr, isSplitting) {
                let position = 1;
                let prevScore = null;
                let sameRankCount = 0;

                return arr.map((item, index) => {
                    if (prevScore === null) {
                        // First item in sorted array
                        position = 1;
                        sameRankCount = 1;
                    } else if (item.totalScore === prevScore) {
                        // Same score as previous item → same rank
                        sameRankCount++;
                    } else {
                        // Different score → assign new position based on ranking method
                        if (isSplitting) {
                            // Competition ranking: skip positions (1,2,2,4)
                            position += sameRankCount;
                        } else {
                            // Dense ranking: no skipping (1,2,2,3)
                            position += 1;
                        }
                        sameRankCount = 1;
                    }

                    prevScore = item.totalScore;

                    return {
                        ...item,
                        position
                    };
                });
            }

            // ============================================================
            // STEP 9: CALCULATE RANKINGS FOR THIS SPECIFIC CLASS
            // ============================================================
            // Get students only in the selected class (not the entire main class)
            const studentsInThisClass = this.students.filter(s =>
                String(s.classId) === String(this.classId)
            );

            // Initialize data structures for this class rankings
            const subjectRankingsThisClass = {};
            const classTotalsThisClass = {};

            // Process each assessment to build subject rankings
            filteredData.forEach(assessment => {
                if (!subjectRankingsThisClass[assessment.subjectId])
                    subjectRankingsThisClass[assessment.subjectId] = {};

                assessment.details.forEach(detail => {
                    const sId = detail.studentIdentifier;

                    // Only process students in the selected class
                    if (!studentsInThisClass.some(st => st.studentIdentifier === sId)) return;

                    // Initialize student record for this subject if not exists
                    if (!subjectRankingsThisClass[assessment.subjectId][sId]) {
                        subjectRankingsThisClass[assessment.subjectId][sId] = {
                            classScoreObtained: 0,
                            classScoreOverall: 0,
                            examScoreObtained: 0,
                            examScoreOverall: 0
                        };
                    }

                    // Accumulate scores by assessment type
                    if (assessment.type === 'Exam') {
                        subjectRankingsThisClass[assessment.subjectId][sId].examScoreObtained += detail.marks || 0;
                        subjectRankingsThisClass[assessment.subjectId][sId].examScoreOverall += assessment.overallMark || 0;
                    } else if (assessment.type !== 'MidTerm') {
                        subjectRankingsThisClass[assessment.subjectId][sId].classScoreObtained += detail.marks || 0;
                        subjectRankingsThisClass[assessment.subjectId][sId].classScoreOverall += assessment.overallMark || 0;
                    }
                });
            });

            // Calculate total scores and rank for each subject in this class
            Object.keys(subjectRankingsThisClass).forEach(subjectId => {
                const arr = Object.keys(subjectRankingsThisClass[subjectId]).map(sId => {
                    const s = subjectRankingsThisClass[subjectId][sId];

                    // Calculate percentage scores
                    const classPercent100 = s.classScoreOverall > 0 ? (s.classScoreObtained / s.classScoreOverall) * 100 : 0;
                    const examPercent100 = s.examScoreOverall > 0 ? (s.examScoreObtained / s.examScoreOverall) * 100 : 0;

                    // Apply weightings and calculate final score
                    const weightedClass = (classPercent100 / 100) * classPercentage;
                    const weightedExam = (examPercent100 / 100) * examPercentage;
                    const totalScore = weightedClass + weightedExam;

                    // Accumulate total score for overall class ranking
                    if (!classTotalsThisClass[sId]) classTotalsThisClass[sId] = 0;
                    classTotalsThisClass[sId] += totalScore;

                    return { studentIdentifier: sId, totalScore };
                });

                // Sort descending by score and assign positions
                arr.sort((a, b) => b.totalScore - a.totalScore);
                const ranked = assignPositions(arr, this.isSubjectSplitting);
                subjectRankingsThisClass[subjectId] = ranked;
            });

            // Calculate overall class ranking for the selected class
            const overallClassRankingThisClass = Object.keys(classTotalsThisClass)
                .map(sId => ({ studentIdentifier: sId, totalScore: classTotalsThisClass[sId] }))
                .sort((a, b) => b.totalScore - a.totalScore);

            // Assign positions for overall class ranking
            const rankedClass = assignPositions(overallClassRankingThisClass, this.isClassSplitting);

            // Create a map for quick position lookup
            const classPositionMap = {};
            rankedClass.forEach(entry => {
                classPositionMap[entry.studentIdentifier] = entry.position;
            });

            const totalStudentsInThisClass = overallClassRankingThisClass.length;

            // ============================================================
            // STEP 10: CALCULATE SUBJECT RANKINGS FOR MAIN CLASS
            // ============================================================
            // This section calculates rankings for all students in the main class
            const subjectRankings = {};
            const classTotals = {};

            subjectIds.forEach(subjectId => {
                subjectRankings[subjectId] = {};

                const subjectAssignments = filteredData.filter(a =>
                    String(a.subjectId) === String(subjectId)
                );

                // Process each assignment and aggregate scores per student
                subjectAssignments.forEach(assessment => {
                    assessment.details.forEach(detail => {
                        const sId = detail.studentIdentifier;

                        // Only include students from the main class
                        if (!studentsInMainClass.some(st => st.studentIdentifier === sId)) return;

                        // Initialize student record if not exists
                        if (!subjectRankings[subjectId][sId]) {
                            subjectRankings[subjectId][sId] = {
                                classScoreObtained: 0,
                                classScoreOverall: 0,
                                examScoreObtained: 0,
                                examScoreOverall: 0
                            };
                        }

                        // Accumulate scores by assessment type
                        if (assessment.type === 'Exam') {
                            subjectRankings[subjectId][sId].examScoreObtained += detail.marks || 0;
                            subjectRankings[subjectId][sId].examScoreOverall += assessment.overallMark || 0;
                        }
                        else if (assessment.type !== 'MidTerm') {
                            subjectRankings[subjectId][sId].classScoreObtained += detail.marks || 0;
                            subjectRankings[subjectId][sId].classScoreOverall += assessment.overallMark || 0;
                        }
                    });
                });

                // Calculate total scores and rank
                const arr = Object.keys(subjectRankings[subjectId]).map(sId => {
                    const s = subjectRankings[subjectId][sId];

                    // Calculate percentages and apply weightings
                    const classPercent100 = s.classScoreOverall > 0 ? (s.classScoreObtained / s.classScoreOverall) * 100 : 0;
                    const examPercent100 = s.examScoreOverall > 0 ? (s.examScoreObtained / s.examScoreOverall) * 100 : 0;

                    const weightedClass = (classPercent100 / 100) * classPercentage;
                    const weightedExam = (examPercent100 / 100) * examPercentage;

                    const totalScore = weightedClass + weightedExam;

                    // Accumulate total score for overall class ranking
                    if (!classTotals[sId]) classTotals[sId] = 0;
                    classTotals[sId] += totalScore;

                    return { studentIdentifier: sId, totalScore };
                });

                // Sort descending by score and assign positions
                arr.sort((a, b) => b.totalScore - a.totalScore);
                const ranked = assignPositions(arr, this.isSubjectSplitting);
                subjectRankings[subjectId] = ranked;
            });

            // Build overall class ranking for main class
            const overallClassRanking = Object.keys(classTotals)
                .map(sId => ({
                    studentIdentifier: sId,
                    totalScore: classTotals[sId]
                }))
                .sort((a, b) => b.totalScore - a.totalScore);

            // ============================================================
            // STEP 11: BUILD FINAL REPORT ROWS
            // ============================================================
            const reportRows = [];
            const stageRemarks = [];

            // Process each subject in the student's subject map
            Object.values(studentSubjectMap).forEach(subject => {
                // Calculate percentages and weighted scores
                const classPercent100 = subject.classScoreOverall > 0 ? (subject.classScoreObtained / subject.classScoreOverall) * 100 : 0;
                const percentageClassScore = (classPercent100 / 100) * classPercentage;

                const examPercent100 = subject.examScoreOverall > 0
                    ? (subject.examScoreObtained / subject.examScoreOverall) * 100
                    : 0;
                const percentageExam = (examPercent100 / 100) * examPercentage;

                const totalScore = percentageClassScore + percentageExam;
                const remarkObj = this.getSubjectRemark(totalScore, stage);

                // Get subject position - main class ranking
                const subjectRankingArray = subjectRankings[subject.SubjectId] || [];
                const subjectEntry = subjectRankingArray.find(
                    s => s.studentIdentifier === student.studentIdentifier
                );
                const overallSubjectPosition = subjectEntry ? subjectEntry.position : 0;

                // Get subject position - selected class ranking
                const subjectRankingThisClass = subjectRankingsThisClass[subject.SubjectId] || [];
                const subjectEntryThisClass = subjectRankingThisClass.find(
                    s => s.studentIdentifier === student.studentIdentifier
                );
                const positionPerSubject = subjectEntryThisClass ? subjectEntryThisClass.position : 0;

                // Get overall class position - main class ranking
                const rankedOverallClass = assignPositions(overallClassRanking, this.isClassSplitting);
                const classEntry = rankedOverallClass.find(
                    s => s.studentIdentifier === student.studentIdentifier
                );
                const overallClassPosition = classEntry ? classEntry.position : 0;

                // Calculate class average for this subject
                const classAveragePerSubject =
                    subjectRankingArray.length > 0
                        ? subjectRankingArray.reduce((sum, s) => sum + s.totalScore, 0) / subjectRankingArray.length
                        : 0;

                // Get student behavior and teacher remarks
                const attendanceDays = this.getAttendance(this.studentId);
                const conductRemark = this.getBehaviouralRemark('Conduct', this.studentId);
                const attitudeRemark = this.getBehaviouralRemark('Attitude', this.studentId);
                const classTeacherRemark = this.getClassTeacherRemark(this.studentId, this.classId);
                const headTeacherRemark = this.getHeadTeacherRemark(this.studentId, this.classId);

                // Get subject teacher information
                const subjectTeacher = this.subjectTeachers.find(t => t.subjectId === subject.SubjectId)?.staffId;
                const subjectTeacherName = this.teachers.find(t => String(t.id) === String(subjectTeacher))?.fullName || '';

                // Calculate final total score (set to 0 if any component is missing)
                const finalTotalScore = (classPercent100 === 0 || examPercent100 === 0 || !remarkObj) ? 0 : totalScore;

                // Build the report row object
                reportRows.push({
                    StudentIdentifier: studentRecord.studentIdentifier,
                    HouseName: studentRecord.houseName,
                    SubjectId: subject.SubjectId,
                    StudentName: studentName,
                    SubjectName: subject.SubjectName,
                    SubjectTeacher: subjectTeacherName,
                    ClassScoreObtained: subject.classScoreObtained,
                    ClassScoreOverall: subject.classScoreOverall,
                    PercentageClassScore: percentageClassScore,
                    ExamScoreObtained: subject.examScoreObtained,
                    ExamScoreOverall: subject.examScoreOverall,
                    PercentageExam: percentageExam,
                    TotalScore: finalTotalScore,
                    GradeNumber: remarkObj ? remarkObj.gradeNumber : 'N/A',
                    SubjectRemark: remarkObj ? remarkObj.remark : 'N/A',
                    Attendance: attendanceDays,
                    Conduct: conductRemark,
                    Attitude: attitudeRemark,
                    ClassName: className,
                    Title: this.reportTitle,
                    TotalStudents: this.classStudents.length,
                    Term: termName,
                    TermEndDate: endTermDate,
                    Year: academicYearName,
                    SchoolDays: schoolDays,
                    TeacherName: teacherName,
                    ClassTeacherRemarks: classTeacherRemark,
                    HeadTeacherRemarks: headTeacherRemark,
                    PromotedClassName: promotedClassName,
                    TermBeginDate: termBeginDate,
                    ClassAveragePerSubject: classAveragePerSubject,
                    PositionPerSubject: positionPerSubject,
                    ClassPercentage: classPercentage,
                    ExamPercentage: examPercentage,
                    OverallClassPosition: overallClassPosition,
                    OverallSubjectPosition: overallSubjectPosition,
                    ClassPosition: classPositionMap[student.studentIdentifier] || 0,
                    Stage: stage,
                    
                });
            });

            // ============================================================
            // STEP 12: CALCULATE AGGREGATE AND RAW SCORE (JHS ONLY)
            // ============================================================
            // Sort rows by subject name for consistent ordering
            reportRows.sort((a, b) => a.SubjectName.localeCompare(b.SubjectName));
            let aggregate = 0;
            let rawScore = 0;

            const normalizedStage = (stage || '').toString().trim().toLowerCase();

            // Special handling for JHS: Calculate aggregate score using core and best elective subjects
            if (normalizedStage === 'jhs' || normalizedStage.includes('junior high')) {
                const subjectSettings = this.mainSubjects || [];

                // Identify core subjects
                const coreSubjects = reportRows.filter(r => {
                    const subjectInfo = subjectSettings.find(s => String(s.id) === String(r.SubjectId));
                    return subjectInfo && subjectInfo.isCore === true;
                });

                // Identify elective subjects
                const electiveSubjects = reportRows.filter(r => {
                    const subjectInfo = subjectSettings.find(s => String(s.id) === String(r.SubjectId));
                    return subjectInfo && subjectInfo.isBestSubject === true && subjectInfo.isCore !== true;
                });

                // Take the top 2 elective subjects
                const bestTwo = electiveSubjects
                    .sort((a, b) => b.TotalScore - a.TotalScore)
                    .slice(0, 2);

                // Combine core subjects with best electives
                const subjectsUsed = [...coreSubjects, ...bestTwo];

                const lowestGradeNumber = 9;

                // Fail conditions for 999 aggregate
                const hasCoreZeroScore = coreSubjects.some(c => c.TotalScore === 0);
                const hasGradeNineInCore = coreSubjects.some(c => parseInt(c.GradeNumber) === lowestGradeNumber);
                const hasAnyZeroRawScore = subjectsUsed.some(s => s.TotalScore === 0);

                if (hasCoreZeroScore || hasGradeNineInCore || hasAnyZeroRawScore) {
                    // Fail condition: Set aggregate to 999 (fail indicator)
                    aggregate = 999;
                    rawScore = 0;
                } else {
                    // Normal calculation: Sum grade numbers and raw scores
                    subjectsUsed.forEach(sub => {
                        if (sub.TotalScore > 0 && sub.SubjectRemark !== 'N/A') {
                            aggregate += parseInt(sub.GradeNumber) || 0;
                            rawScore += sub.TotalScore || 0;
                        }
                    });
                }
            }

            // ============================================================
            // STEP 13: FINALIZE REPORT AND RENDER
            // ============================================================
            // Assign aggregate and raw score to all report rows
            reportRows.forEach(r => {
                r.Aggregate = aggregate;
                r.RawScore = rawScore;
            });

            // Store the report data
            this.terminalReport = reportRows;

            // Get stage-specific remarks
            stageRemarks.push(this.getStageSubjectRemarks(stage));
            const remarksString = stageRemarks.join(', ');
            
            this.viewReport = true;
            this.reportData = {
                header: this.header,
                details: reportRows,
                remarks: [
                    {
                        Remarks: remarksString
                    }
                ]
            };
            
            // Render the final report
            this.renderReport(this.header, reportRows, [{ Remarks: remarksString }], this.reportPath);
            this.isLoading = false;
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
            this.isLoading = true;
          if (this.reportType === '5'){
            this.printReportWithAnalysis();
          }
          else {
              this.searchReport();
          }
          this.isLoading = false;
        },
        printReportWithAnalysis() {
            if (!this.academicYearId || !this.termId || !this.classId || !this.studentId) {
                this.toastHandler('warning', 'Please select all required fields.');
                return;
            }

            this.isLoadingReports = true;
            this.type5Loading = true;
            this.pdfUrl = null;

            axios.get('/SmReports/DownloadTerminalReportWithAnalysisPdf', {
                params: {
                    studentId: this.studentId,
                    classId: this.classId,
                    academicYearId: this.academicYearId,
                    termId: this.termId
                },
                responseType: 'blob'
            })
                .then(response => {
                    const blob = new Blob(
                        [response.data],
                        { type: 'application/pdf' }
                    );

                    this.pdfUrl = URL.createObjectURL(blob);
                })
                .catch(() => {
                    this.toastHandler('error', 'Error generating report.');
                })
                .finally(() => {
                    this.isLoadingReports = false;
                    this.type5Loading = false;
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
    watch: {
        stage(newStage) {
            if (this.reportType === "3") {
                this.reportPath =
                    'https://res.cloudinary.com/dusydqiob/raw/upload/v1786537829/erp-reports/school-manager/terminaltype-3_h7wwe5.rdl';

                if (newStage === 'JHS') {
                    this.viewerPath =
                        'https://res.cloudinary.com/dkanxfium/raw/upload/v1787069063/terminal-report-3-jhs_ompvi0.json';
                } else {
                    this.viewerPath =
                        'https://res.cloudinary.com/dkanxfium/raw/upload/v1787069063/terminal-report-3-basic_devd9j.json';
                }
            }
        }
    }
});
//app.component('report-viewer', window.ReportViewerComponent)
app.mount('#app');