import axios from "axios";


export default function OwnNotMoreThanFiveCourses(sid) {

  const theUrl = 'http://localhost:4000/ownnotmorethanfivecourses/' + sid;
  const verification = () => {
    axios.get(theUrl)
        .then((response) => {
          return response;
        })
        .catch((error) => {
          console.log(error.data);
        });
    
  };

  return verification();
}
