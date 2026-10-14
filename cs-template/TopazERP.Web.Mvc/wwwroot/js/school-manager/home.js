const academicYearApp = Vue.createApp({
    data() {
        return {
            academicYearTitle: ''
        }
    },
    methods: {
        getAcademicYear() {

            axios.get('/SmMainSetups/GetCurrentAcademicYear')
                .then(response => {

                    let academicYear = response.data;

                    if (academicYear) {
                        this.academicYearTitle = 'Academic Year: ' + academicYear.item2;
                    }
                    else {
                        this.academicYearTitle = 'Academic Year: Not Set';
                    }

                })
                .catch(err => {
                    console.log(err);
                });
        },
    },
    mounted() {
        this.getAcademicYear();
    },
});

academicYearApp.mount('#academicYearHeader');