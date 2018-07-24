// Variable to know if interval must re update
let mustReUpdate = false;

// Variable in case user wants to clearInterval(availabilityInterval)
let availabilityInterval = null;

// Inserts availability column to the DOM and returns the existing courses
function insertAvailabilityColumn(courses) {
	// Find courses table
	const table = $('div.mySchedule-summary table');

	// Add "Cupos" header
  if ($('div[title=Cupos]').length == 0) {
  	table.find('thead tr').prepend('<th scope="col" data-sort-direction="disabled"' +
        ' class="sort-disabled availability-col ui-state-default" data-property="availability"' +
        ' xe-field="availability" style="width: 8em;"><div class="title" title="Cupos" style="width:' +
        ' auto;">Cupos</div></th>');
  }

  const coursesUsed = {};

	// Add availability column with id
	table.find('tbody tr').each((index, elem) => {
		elem = $(elem);
		const currId = elem.attr('data-id');
		const courseCRN = elem.find('td[data-property=courseReferenceNumber]').text();
		const courseCode = elem.find('td[data-property=subjectCourseSectionNumber]')
        .text().split(',')[0].replace(/ /g,'').toUpperCase();
		const availabilityId = courseCRN + 'availability';
    let currCourse = courses.find((course) => course.courseCRN == courseCRN);
		if (!currCourse) {
      currCourse = {courseCRN, courseCode, availabilityId, availability: '-'};
      courses.push(currCourse);
    }
    coursesUsed[courseCRN] = true;
		if ($("#" + availabilityId).length > 0) return;
    elem.prepend('<td id="' + availabilityId + '"data-id="' + currId +
        '" data-property="availability" xe-field="availability" class="readonly"' +
        ' style="width: auto;">' + currCourse.availability + '</td>');
  });

  courses.slice().forEach((course) => {
    if (!(course.courseCRN in coursesUsed)) {
      courses.splice(courses.indexOf(course), 1);
    }
  });

  // Return the inserted courses
  return courses;
}

// Function that updates all courses
function updateAllCourses(courses) {
	// Go on each course
	updateAllCoursesHelper(courses, 0);
}

// Calls the api and updates the availability UI for all courses recursively.
function updateAllCoursesHelper(courses, index) {
  if (index >= courses.length) {
    // If got all, mustReUpdate on next interval
    mustReUpdate = true;
    console.log('Done updating all courses');
    console.log('-------------------------------');
    return;
  }
  mustReUpdate = false;
  const courseCode = courses[index].courseCode;
  const courseCRN = courses[index].courseCRN;
  const availabilityId = courses[index].availabilityId;
  const resetUrl = '/StudentRegistrationSsb/ssb/classSearch/resetDataForm';
  const sectionsUrl = '/StudentRegistrationSsb/ssb/searchResults/searchResults?' +
      'txt_subjectcoursecombo=' + courseCode + '&txt_term=201820&pageOffset=0&page' +
      'MaxSize=50&sortColumn=subjectDescription&sortDirection=asc';
  
  // Resets last query (api requires this call so next data is accurate)
  $.get(resetUrl).done(() => {
    // Gets all sections of course with code courseCode
    $.get(sectionsUrl).done((data) => {
      // Filter the specific course from all the courses according to the courseCRN
      const course = data.data.filter((course) => course.courseReferenceNumber == courseCRN)[0];
      if (course) {
        console.log('Updated: ' + courseCode);
        // Update availability if the course was found
        $("#" + availabilityId).text(course.seatsAvailable);
        // Save a cache in case the table gets restored
        courses[index].availability = course.seatsAvailable;
      }
      // continue with the next course
      // Note: Calls can't be done async because reset call might get messed up,
      // thats why we continue once we're done with the current course.
      updateAllCoursesHelper(courses, index + 1);
    }).fail((data) => {
      console.log("Error fetching availability of " + courseCode + " - " + courseCRN);
    });
  });
}

function main() {
  let courses = [];
	insertAvailabilityColumn(courses);
	updateAllCourses(courses);
	// Update on intervals of 30 seconds (if too low, requests may get blocked)
	availabilityInterval = setInterval(() => {
		if (mustReUpdate) {
      console.log('-------------------------------');
      console.log('Starting update');
			updateAllCoursesHelper(courses, 0);
		}
	}, 30 * 1000);

  $("#saveButton").click(() => {
    let modifiedCoursesInterval = setInterval(() => {
      console.log('Waiting to get saved...');
      if ($("div.loading").length == 0) {
        courses = insertAvailabilityColumn(courses);
        console.log('courses updated!');
        clearInterval(modifiedCoursesInterval);
      }
    }, 2.5 * 1000);
  });

}


main();
