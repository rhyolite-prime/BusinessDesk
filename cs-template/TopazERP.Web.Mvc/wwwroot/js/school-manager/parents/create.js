Vue.use(window.vuelidate.default);
const { required, minValue } = window.validators;

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        isLoading: false,
        payload: {},
        relationshipList: [],
        
        id: null,
        tenantId: null,
        parentList: [],
        firstGuardianRelationshipId: '00000000-0000-0000-0000-000000000000',
        secondGuardianRelationshipId: '00000000-0000-0000-0000-000000000000',
        firstGuardianName: '',
        firstGuardianPhoneNo: '',
        firstGuardianEmail: '',
        firstGuardianProfession: '',
        secondGuardianName: '',
        secondGuardianPhoneNo: '',
        secondGuardianEmail: '',
        secondGuardianProfession: '',
        emptyGuid: '00000000-0000-0000-0000-000000000000'

    },
    validations() {

        return {

            firstGuardianName: {
                required
            },
            firstGuardianRelationshipId: {
                required
            },

        }


    },
    methods: {

     
        saveParent() {

            this.$v.$touch();

            if (this.$v.$invalid) {

                for (let key in Object.keys(this.$v)) {

                    const input = Object.keys(this.$v)[key];

                    if (this.$v[input].$error) {

                        this.$refs[input].focus();

                        break;
                    }

                }

                return;
            }


            this.payload = {};
            this.isLoading = true;
            if (this.secondGuardianRelationshipId == '') {

                this.secondGuardianRelationshipId = this.emptyGuid;
            }

            this.payload.firstGuardianName = this.firstGuardianName;
            this.payload.firstGuardianPhoneNo = this.firstGuardianPhoneNo;
            this.payload.firstGuardianEmail = this.firstGuardianEmail;
            this.payload.firstGuardianProfession = this.firstGuardianProfession;
            this.payload.secondGuardianName = this.secondGuardianName;
            this.payload.secondGuardianPhoneNo = this.secondGuardianPhoneNo;
            this.payload.secondGuardianEmail = this.secondGuardianEmail;
            this.payload.secondGuardianProfession = this.secondGuardianProfession;
            this.payload.firstGuardianRelationshipId = this.firstGuardianRelationshipId;
            this.payload.secondGuardianRelationshipId = this.secondGuardianRelationshipId;

            axios.post('/Parents/CreateParent', this.payload).then((response) => {

                this.isLoading = false;
                this.toastHandler('', 'Parent info saved.');

            }).catch((error) => {

                this.isLoading = false;
                this.toastHandler('error', 'Unable to save parent info.');

            });
             

            

        },

        saveStudentParentMapping() {

            this.payload = {};

            this.payload.studentId = this.selectedStudentId;
            this.payload.parentId = this.parentId;

            axios.post('/Parents/CreateOrUpdateParentStudentMapping', this.payload).then((response) => {

                this.parentId = null;
                this.resetForm();

            }).catch((error) => {

                console.log(error);
            });
        },
        getSchClasses() {

            axios.get('/SchSetups/GetClasses').then(response => {

                this.schClasses = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get classes.');

            });
        },

        getStudents() {

            axios.get('/Students/GetStudentByClass?id=' + this.selectedClassId).then(response => {

                this.studentList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get students.');

            });

        },

        generateStudentIdentifier() {

            this.studentIdentifier = Math.floor(Math.random() * 99999) + 100;

        },
        getNationalities() {

            axios.get('/jsonDataSample/countries.json').then(response => {

                this.nationalityList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get nationalities.');

            });
        },
        getParents() {

            axios.get('/Parents/GetParents').then(response => {

                this.parentList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get parents.');

            });
        },
        getStudentStatus() {

            axios.get('/SchSetups/GetStatus').then(response => {

                this.studentStatusList = response.data;
                if (this.studentStatusList.length) {

                    this.studentStatusId = this.studentStatusList[0].id;

                }

            }).catch(err => {

                this.toastHandler('error', 'Unable to get student status.');

            });
        },
        getAcademicYears() {

            axios.get('/SchSetups/GetAcaYrs').then(response => {

                this.academicYearList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get academic years.');

            });
        },
        getReligions() {

            axios.get('/SharedResource/GetReligions').then(response => {

                this.religionList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get religions.');

            });
        },
        getRelationships() {

            axios.get('/SharedResource/GetRelationships').then(response => {

                this.relationshipList = response.data;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get academic years.');

            });
        },
        getStudentDetail() {

            axios.get('/Students/GetStudentDetails?id=' + this.selectedStudentId).then(response => {
 
                
                this.studentIdentifier = response.data.studentIdentifier;
                this.firstName = response.data.firstName;
                this.dateOfBirth = this.formatDate(response.data.dateOfBirth);
                this.enrollmentDate = this.formatDate(response.data.enrollmentDate);
                this.religionId = response.data.religionId;
                this.academicYearId = response.data.academicYearId;
                this.homeAddress = response.data.homeAddress;
                this.lastName = response.data.lastName;
                this.middleName = response.data.middleName;
                this.nationalityId = response.data.nationalityId;
                this.classId = response.data.classId;
                this.cityOrLocation = response.data.cityOrLocation;
                this.id = response.data.id;
                this.tenantId = response.data.tenantId;

            }).catch(err => {

                this.toastHandler('error', 'Unable to get student detail');

            });

        },
        getParentDetail() {

            axios.get('/Parents/GetParentDetails?id=' + this.selectedStudentId).then(response => {

                this.parentId = response.data.id;
                this.firstGuardianName = response.data.firstGuardianName;
                this.firstGuardianPhoneNo = response.data.firstGuardianPhoneNo;
                this.firstGuardianEmail = response.data.firstGuardianEmail;
                this.firstGuardianProfession = response.data.firstGuardianProfession;
                this.secondGuardianName = response.data.secondGuardianName;
                this.secondGuardianPhoneNo = response.data.secondGuardianPhoneNo;
                this.secondGuardianEmail = response.data.secondGuardianEmail;
                this.secondGuardianProfession = response.data.secondGuardianProfession;
                this.firstGuardianRelationshipId = response.data.firstGuardianRelationshipId;
                this.secondGuardianRelationshipId = response.data.secondGuardianRelationshipId;

                
            }).catch(err => {

                this.toastHandler('error', 'Unable to get parent detail.');

            });
        },
        formatDate(dateInput) {

            return moment(dateInput).format("YYYY-MM-DD");

        },
        resetForm() {

            this.studentIdentifier = null;
            this.firstName = null;
           
            this.religionId = null;
            this.academicYearId = null;
            this.homeAddress = null;
            this.lastName = null;
            this.middleName = null;
            this.nationalityId = null;
          
            this.classId = null;
            this.cityOrLocation = null;

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
    computed: {

        classList() {

            this.schClasses.forEach((v) => {

                if (v.streamId != '00000000-0000-0000-0000-000000000000') {
                    v.className = v.className + '-' + v.streamName;
                }

            });

            return this.schClasses;
        }
    },
    watch: {

        selectedClassId(val) {

            this.getStudents();
        },
        selectedStudentId(val) {

            this.getStudentDetail();
            this.getParentDetail();
        }

    },

    created() {
         
        this.getRelationships();
    },
});