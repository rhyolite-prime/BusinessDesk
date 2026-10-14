 

var vue = new Vue({
    el: '#app',
    data: {

        isShimmerLoading: false,
        payload: {},
        uploadFile: null

    },
   
    methods: {

        onFileUpload(evt) {

            this.uploadFile = evt.target.files[0];

        }
        
    },
    computed: {
        
        enableUpload() {

            return this.uploadFile == null ;
        }
    },
    watch: {

         

    },

    created() {

        
    },
});