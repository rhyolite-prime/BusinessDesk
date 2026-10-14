const app = Vue.createApp({
    data() {
        return {
            emptyGuid: "00000000-0000-0000-0000-000000000000",
            form: {
                staffIdentifier: '',
                dateOfBirth: '',
                dateOfEmployment: '',
                dateAppointed: '',
                datePromotedToGrade: ''
            },
            titles: [],
            designations: [],
            grades: [],
            academicYears: [],
            relationships: [],
            bioSaved: false,
            staffId: '',
            dobError: '',
            errors: {},
        }
    },
    methods: {
        loadDropdowns() {
            // Titles
            axios.get(`/jsonDataSample/titles.json?v=${new Date().getTime()}`).then(res => {
                this.titles = res.data;
            });
            // Designations
            axios.get('/SmStaffSetups/ListAllStaffDesignations').then(res => {
                this.designations = res.data;
            });
            // Grades
            axios.get('/SmStaffSetups/ListAllStaffGrades').then(res => {
                this.grades = res.data;
            });
            // Academic Years
            axios.get('/SmMainSetups/ListAllAcademicYears').then(res => {
                this.academicYears = res.data;
            });
            // Next-of-Kin Relationships
            axios.get(`/jsonDataSample/relationships.json?v=${new Date().getTime()}`).then(res => {
                this.relationships = res.data;
            });
        },
        setAcademicYearName() {
            const selected = this.academicYears.find(y => y.id === this.form.academicYearId);
            this.form.academicYearName = selected ? selected.name : '';
        },
        setDesignationName() {
            const selected = this.designations.find(d => d.id === this.form.designationId);
            this.form.designationName = selected ? selected.name : '';
        },
        setTitleName() {
            const selected = this.titles.find(d => d.id === this.form.titleId);
            this.form.titleName = selected ? selected.name : '';
        },
        setGradeName() {
            const selected = this.grades.find(g => g.id === this.form.gradeId);
            this.form.gradeName = selected ? selected.name : '';
        },
        validateForm(){
            this.errors = {};

            // Required fields
            if (!this.form.firstName || this.form.firstName.trim() === '') {
                this.errors.firstName = 'First name is required';
            }

            if (!this.form.lastName || this.form.lastName.trim() === '') {
                this.errors.lastName = 'Last name is required';
            }

            if (!this.form.email) {
                this.errors.email = 'Email is required';
            }

            if (!this.form.contactNumber) {
                this.errors.contactNumber = 'Contact number is required';
            }

            if (!this.form.address) {
                this.errors.address = 'Address is required';
            }

            if (!this.form.dateOfEmployment) {
                this.errors.dateOfEmployment = 'Employment date is required';
            }

            if (!this.form.dateAppointed) {
                this.errors.dateAppointed = 'Appointment date is required';
            }

            if (!this.form.academicYearId || this.form.academicYearId === this.emptyGuid) {
                this.errors.academicYearId = 'Academic year is required';
            }

            if (!this.form.nextOfKinName) {
                this.errors.nextOfKinName = 'Next of kin name is required';
            }

            if (!this.form.nextOfKinContactNumber) {
                this.errors.nextOfKinContactNumber = 'Next of kin contact is required';
            }
            if (!this.form.titleId || this.form.titleId === this.emptyGuid) {
                this.errors.titleId = 'Title is required';
            }

            if (!this.form.nextOfKinRelationshipId || this.form.nextOfKinRelationshipId === this.emptyGuid) {
                this.errors.nextOfKinRelationshipId = 'Next Of Kin Relationship is required';
            }

            // DOB already handled separately
            if (this.dobError) {
                this.errors.dateOfBirth = this.dobError;
            }

            // return true if no errors
            return Object.keys(this.errors).length === 0;
        },
        saveStaff() {
            if (!this.validateForm()) {
                this.toastHandler('error', 'Please enter required fields.');
                return;
            }
            axios.post('/SmStaffSetups/CreateStaffBio', this.form)
                .then((response) => {
                    if (response.data.code === 200) {
                        this.toastHandler('', 'data saved.');
                        this.bioSaved = true;
                        this.form.id = response.data.id;
                        window.location.href = '/SmStaffSetups/UpdateStaff?id=' + this.form.id;
                    } else {
                        this.toastHandler('error', response.data.message);
                        
                    }
                })
                .catch(() => this.toastHandler('error', 'Unable to save staff.'));
        },
        toastHandler(type, message) {
            toastr.options = { closeButton: true, progressBar: true, timeOut: 4000 };
            type === 'error' ? toastr.error(message) : toastr.success(message);
        },
        setDefaultDates() {
            const today = new Date().toISOString().substr(0, 10);
            this.form.dateOfBirth = today;
            this.form.dateOfEmployment = today;
            this.form.dateAppointed = today;
            this.form.datePromotedToGrade = today;
        }
    },
    watch: {
        'form.dateOfBirth'(value) {
            if (!value) {
                this.dobError = '';
                return;
            }

            const today = new Date();
            const dob = new Date(value);

            let age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();

            // adjust age if birthday hasn't occurred yet this year
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
                age--;
            }

            if (age < 15) {
                this.dobError = 'Staff must be at least 15 years old.';
            } else {
                this.dobError = '';
            }
        }
        // add some required fields validation
        
    },
    mounted() {
        this.loadDropdowns();
        this.setDefaultDates();
    }
});
app.mount('#app');
