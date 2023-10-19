$(function () {
  $.scrollify({
    section: ".scrollSection",
    scrollbars: false,
    before: function (i, panels) {
      var ref = panels[i].attr("data-section-name");

      $(".scrollifyPagination a.active").removeClass("active");

      $(".scrollifyPagination a[href='#" + ref + "']").addClass("active");
    }

  });

  $(".scrollifyPagination a").on("click", function () {
    $.scrollify.move($(this).attr("href"));
  });

});
