const app = Vue.createApp({
    data() {
        return {
            form: {
                staffId: window.staffId || '',
                staffName: '',
                institute: '',
                programme: '',
                certificateName: '',
                startDate: new Date().toISOString().slice(0, 10),
                endDate: new Date().toISOString().slice(0, 10),
                isAcademic: false,
            },

            certificates: [],
            qualifications: [],
            staffList: [],
            staffName: '',
        }
    },
    methods: {
        getStaffList() {
            axios.get('/SmStaffSetups/ListAllStaffBios')
                .then(res => {
                    this.staffList = res.data;

                    // Now that staffList is loaded, get the staff name
                    if (this.form.staffId) {
                        this.getStaffName();
                    }
                })
                .catch(() => this.toastHandler('error', 'Unable to load staff data.'));
        },

        getStaffName() {
            const selected = this.staffList.find(s => s.id === this.form.staffId);
            this.staffName = selected
                ? `${selected.firstName} ${selected.otherName || ''} ${selected.lastName}`.trim()
                : '';

            return this.staffName;
        },
        saveQualification() {
            // save staffName from staffId
            if (this.form.staffId) {
                this.setStaffName();
            }
            if (this.form.id) {
                // If id exists, update instead of create
                this.updateQualification();
                return;
            }
            axios.post('/SmStaffSetups/CreateStaffQualification', this.form)
                .then(response => {
                    if (response.data.code === 200) {
                        this.toastHandler('', 'Qualification added successfully.');
                        this.form = { staffId: this.form.staffId, startDate: new Date().toISOString().slice(0,10), endDate: new Date().toISOString().slice(0,10), isAcademic: true };
                        this.getStaffQualification();
                    } else {
                        this.toastHandler('error', response.data.message);
                    }
                })
                .catch(() => this.toastHandler('error', 'Unable to save qualification.'));
        },
        updateQualification() {
            axios.post('/SmStaffSetups/UpdateStaffQualification', this.form)
                .then(() => {
                    this.toastHandler('', 'Qualification updated successfully.');
                    this.form = { staffId: this.form.staffId, startDate: new Date().toISOString().slice(0,10), endDate: new Date().toISOString().slice(0,10), isAcademic: true };
                    this.getStaffQualification(); // refresh table
                })
                .catch(() => this.toastHandler('error', 'Unable to update qualification.'));
        },
        loadDropdowns() {
            // certificate
            axios.get('/SmStaffSetups/ListAllCertificates/').then(res => {
                this.certificates = res.data;
            });
        },
        setCertificateName() {
            const selected = this.certificates.find(y => y.id === this.form.certificateId);
            this.form.certificateName = selected ? selected.name : '';
        },
        setStaffName() {
            const selected = this.staffList.find(s => s.id === this.form.staffId);
            if (selected) {
                this.form.staffName = `${selected.firstName} ${selected.otherName} ${selected.lastName}`.trim();
            } else {
                this.form.staffName = '';
            }
        },


        getStaffQualification() {
            axios.get('/SmStaffSetups/ListAllStaffQualifications/')
                .then(response => {
                    this.qualifications = response.data.filter(q => q.staffId === this.form.staffId);
                }).catch(() => {
                    this.toastHandler('error', 'Unable to load staff qualifications.');
                });
        },
        editQualification(qualification) {
            this.form = {
                ...qualification,
                startDate: qualification.startDate ? qualification.startDate.slice(0, 10) : '',
                endDate: qualification.endDate ? qualification.endDate.slice(0, 10) : ''
            };
        },


        deleteQualification(id) {
            axios.post(`/SmStaffSetups/DeleteStaffQualification?id=${id}`)
                .then(() => {
                    this.toastHandler('', 'Qualification deleted successfully.');
                    this.getStaffQualification(); // refresh table
                })
                .catch(() => this.toastHandler('error', 'Unable to delete qualification.'));
        },
        toastHandler(type, message = 'An unexpected error occurred.') {
            toastr.options = {
                closeButton: true,
                progressBar: true,
                showMethod: 'fadeIn',
                hideMethod: 'fadeOut',
                timeOut: 5000,
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
    mounted() {
        this.form.staffId = window.staffId;

        this.loadDropdowns();
        this.getStaffList();
        this.getStaffQualification();
    }

});
app.mount('#app');