// DS - Question expanding javascript
$('a.question').live("click", function(){
	  if($(this).hasClass("exp")){
		$(this).removeClass("exp");
		$(this).next('div.question-input').slideUp();
	  }else{
		$('div.question-input').slideUp();
		$('a.question.exp').removeClass("exp");
	  	$(this).next('div.question-input').slideDown();
	  	$(this).addClass("exp");
	  }
}); 

$("button.create-project").live("click",function(){
		$("button.yes-success").click();
});
  