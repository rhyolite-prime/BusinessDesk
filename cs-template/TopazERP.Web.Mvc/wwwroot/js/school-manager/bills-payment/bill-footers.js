const app = Vue.createApp({
    data() {
        return {
            emptyGuid: '00000000-0000-0000-0000-000000000000',
            billFooters: [],
            academicYears: [],
            classes: [],        // level-classes
            mainClasses: [],
            streams: [],
            levels: [],
            terms: [],
            students: [],

            // form state
            academicYearId: '',
            termId: '',
            classId: '',
            levelId: '',
            toClass: true,
            toSchool: false,
            message: '',
            orderNumber: 0,
            billFooterDetails: [],
            isEdit: false,
            editId: null,
            isLoading: false,
            expanded: {}, 
            studentSearch: '',
            page: 1,
            perPage: 10,
            footerPage: 1,
            footerPerPage: 6,
            tenantId: null,
            isShimmerLoading: false,
            
        }
    },
    computed: {
        allLevelClasses() {
            return this.classes.map(c => ({
                id: c.id,
                name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
            }));
        },
        formStudents() {
            let list = this.students;

            if (this.studentSearch) {
                const q = this.studentSearch.toLowerCase();
                list = list.filter(s => {
                    const fullName = `${s.firstName || ''} ${s.middleName || ''} ${s.lastName || ''}`.toLowerCase();
                    return fullName.includes(q) || (s.admissionNo || '').toLowerCase().includes(q);
                });
            }

            return list;
        },
        formRows() {
            if (this.isEdit) {
                const rows = this.students.map(s => ({
                    s,
                    detail: this.billFooterDetails.find(d => d.studentId === s.id) || null
                }));
                return rows.sort((a, b) => {
                    const aOn = a.detail ? 1 : 0;
                    const bOn = b.detail ? 1 : 0;
                    if (bOn !== aOn) return bOn - aOn;
                    return this.studentName(a.s.id).localeCompare(this.studentName(b.s.id));
                });
            }
            return this.formStudents.map(s => ({
                s,
                detail: this.billFooterDetails.find(d => d.studentId === s.id) || null
            }));
        },
        totalPages() {
            return Math.ceil(this.formRows.length / this.perPage) || 1;
        },
        paginatedData() {
            const start = (this.page - 1) * this.perPage;
            return this.formRows.slice(start, start + this.perPage);
        },
        totalFooterPages() {
            return Math.ceil(this.billFooters.length / this.footerPerPage) || 1;
        },
        paginatedFooterData() {
            const start = (this.footerPage - 1) * this.footerPerPage;
            return this.billFooters.slice(start, start + this.footerPerPage);
        },
        
    },
    watch: {
        toSchool(val) {
            this.toClass = !val;
        }
    },
    methods: {
        nextPage() {
            if (this.page < this.totalPages) this.page++;
        },
        prevPage() {
            if (this.page > 1) this.page--;
        },
        nextFooterPage() {
            if (this.footerPage < this.totalFooterPages) this.footerPage++;
        },
        prevFooterPage() {
            if (this.footerPage > 1) this.footerPage--;
        },
        
        uuid() {
            return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
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
            return axios.get(`/jsonDataSample/terms.json?v=${Date.now()}`).then(res => {
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

        getLevels() {
            return axios.get('/SmMainSetups/ListAllLevels/').then(res => {
                this.levels = res.data;
            });
        },

        getStudents() {
            return axios.get('/SmStudentSetups/ListAllStudents/').then(res => {
                this.students = res.data;

                this.students.forEach(s => {
                    s.name = `${s.lastName} ${s.firstName} ${s.otherName}`.trim();
                    s.displayText = `${s.studentIdentifier} - ${s.name}`;
                });
            });
        },

        getBillFooters() {
            return axios.get('/SmBillingAndPayments/GetBillFooters/').then(res => {
                this.billFooters = (res.data || []).map(f => ({
                    ...f,
                    details: f.details || []
                }));
            });
        },
     
        getLevelClasses(levelId) {
            if (!levelId) {
                return this.classes.map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                }));
            }
            return this.classes
                .filter(c => c.levelId === levelId)
                .map(c => ({
                    id: c.id,
                    name: `${this.getMainClassName(c.classId)} ${this.getStreamName(c.streamId)}`.trim()
                }));
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
        levelName(id) {
            return this.levels.find(l => l.id === id)?.levelName || '';
        },
        studentName(id) {
            const student = this.students.find(s => s.id === id);
            if (!student) return '';
            const combinedName = `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.replace(/\s+/g, ' ').trim();
            return combinedName || student.studentIdentifier || '';
        },
        yearName(id) {
            return this.academicYears.find(y => y.id === id)?.name || '';
        },
        termName(id) {
            return this.terms.find(t => t.id === id)?.name || '';
        },
        
        /* =================== form: apply toggles =================== */
        getDetail(studentId) {
            return this.billFooterDetails.find(d => d.studentId === studentId) || null;
        },
        toggleApply(student) {
            const existing = this.getDetail(student.id);
            if (existing) {
                this.billFooterDetails = this.billFooterDetails.filter(d => d.studentId !== student.id);
            } else {
                this.billFooterDetails.push({
                    id: this.uuid(),
                    billFooterId: this.editId || this.emptyGuid,
                    studentId: student.id,
                    classId: student.classId || this.emptyGuid,
                    levelId: student.levelId || this.emptyGuid,
                });
            }
        },
        
        /* =================== save / edit / remove =================== */
        saveBillFooter() {
            if (!this.message || !this.message.trim()) {
                this.toastHandler('warning', 'Please enter a message.');
                return;
            }
            this.isLoading = true;

            const payload = {
                message: this.message,
                academicYearId: this.academicYearId,
                termId: this.termId,
                toSchool: this.toSchool,
                toClass: this.toClass,
                classId: this.classId,
                levelId: this.levelId,
                orderNumber: this.orderNumber,
                details: this.billFooterDetails.map(d => ({ ...d })),
            };

            if (this.isEdit) {
                payload.id = this.editId;
                payload.tenantId = this.tenantId;
                axios.post('/SmBillingAndPayments/UpdateBillFooter', payload)
                    .then(() => {
                        this.toastHandler('success', 'Updated successfully');
                        this.getBillFooters();
                        this.resetForm();
                    })
                    .catch(() => this.toastHandler('error'))
                    .finally(() => { this.isLoading = false; });
            } else {
                axios.post('/SmBillingAndPayments/CreateBillFooter', payload)
                    .then(res => {
                        if (res.data.code === 409) {
                            this.toastHandler('warning', res.data.message);
                            return;
                        }
                        this.toastHandler('success', 'Created successfully');
                        this.getBillFooters();
                        this.resetForm();
                    })
                    .catch(() => this.toastHandler('error'))
                    .finally(() => { this.isLoading = false; });
            }
        },

        edit(b) {
            this.isEdit = true;
            this.editId = b.id;
            this.message = b.message;
            this.academicYearId = b.academicYearId;
            this.termId = b.termId;
            this.toSchool = b.toSchool;
            this.toClass = b.toClass;
            this.orderNumber = b.orderNumber;
            this.billFooterDetails = b.details.map(d => ({ ...d }));
            this.classId = b.classId || '';
            this.levelId = b.levelId || '';
            this.tenantId = b.tenantId;
          

            this.$nextTick(() => {
                document.getElementById('billFooterForm')
                    ?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
            });
        },
        scrollToForm(){
            this.resetForm();
            this.$nextTick(() => {
                document.getElementById('billFooterForm')
                    ?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
            });
        },
        async remove(id) {
            const result = await Swal.fire({
                title: 'Confirm Delete',
                text: `Are you sure you want to delete this bill footer?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Yes',
                cancelButtonText: 'No',
                confirmButtonColor: '#d33',
                cancelButtonColor: '#6c757d'
            });
            if (!result.isConfirmed) {
                return;
            }
            axios.delete(`/SmBillingAndPayments/DeleteBillFooter?id=${id}`)
                .then(() => {
                    this.toastHandler('success', 'Deleted successfully');
                    this.billFooters = this.billFooters.filter(f => f.id !== id);
                    if (this.editId === id) this.resetForm();
                })
                .catch(() => this.toastHandler('error'));
        },
        resetForm() {
            this.isEdit = false;
            this.editId = null;
            this.message = '';
            this.orderNumber = 0;
            this.toSchool = false;
            this.toClass = true;
            this.studentSearch = '';
        },

        toastHandler(type, message = 'An unexpected error occurred.') {
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
    async mounted() {
        this.isLoading = true;

        try {
            await Promise.all([
                this.getAcademicYears(),
                this.getTerms(),
                this.getMainClasses(),
                this.getStreams(),
                this.getClasses(),
                this.getLevels(),
                this.getStudents(),
                this.getBillFooters()
            ]);
        }
        catch (err) {
            console.error(err);
            this.toastHandler("error", "Failed to load page data.");
        }
        finally {
            this.isLoading = false;
        }
    },
});
app.component('searchable-dropdown', SearchableDropdown);
app.mount('#app');