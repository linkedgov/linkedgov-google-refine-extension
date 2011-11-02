package org.linkedgov.command;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONWriter;

import java.io.IOException;

import com.google.refine.commands.Command;
import com.google.refine.ProjectMetadata;
import java.util.Enumeration;
//REquires project param to have a value
public class SaveMetaInformationCommand extends Command {
    
    @Override
    public void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        System.err.println("*******");
        
        try {
            ProjectMetadata pm = getProjectMetadata(request);
            
			Enumeration e = request.getParameterNames();
			System.err.println(e);
			//PrintWriter out = res.getWriter ();
			while (e.hasMoreElements()) {
				String name = (String)e.nextElement();
				System.err.println(name);
				if (!name.equals("project")) {
					String value = request.getParameter(name);
					System.err.println(name + " = " + value);
					pm.setCustomMetadata(name, value);
				}
			}
            
            respond(response, "{ \"code\" : \"ok\" }");
        } catch (Exception e) {
            respondException(response, e);
        }
    }
}
